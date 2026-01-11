import WebSocket from 'ws'
import { Interface, formatUnits } from 'ethers'
import { TransferAnalytics } from '@/lib/transfer-analytics'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const iface = new Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
])

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function safeJsonParse(s: string): any | null {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export async function GET() {
  const apiKey = process.env.ALCHEMY_API_KEY
  const contractAddress = process.env.MONITOR_CONTRACT_ADDRESS
  const network = process.env.MONITOR_NETWORK

  if (!apiKey || !contractAddress || !network) {
    return new Response('Missing env vars: ALCHEMY_API_KEY, MONITOR_CONTRACT_ADDRESS, MONITOR_NETWORK', { status: 500 })
  }

  const wsUrl = `wss://eth-${network}.g.alchemy.com/v2/${apiKey}`
  const encoder = new TextEncoder()
  const analytics = new TransferAnalytics()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const ws = new WebSocket(wsUrl)
      let isClosed = false

      function send(data: unknown) {
        if (!isClosed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
          } catch (err) {
            isClosed = true
          }
        }
      }

      ws.on('open', () => {
        send({ kind: 'status', connected: true })

        ws.send(
          JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'eth_subscribe',
            params: ['logs', { address: contractAddress }]
          })
        )
      })

      ws.on('message', (raw) => {
        const msg = safeJsonParse(raw.toString())
        if (!msg) return

        if (msg.method !== 'eth_subscription') return

        const log = msg.params?.result
        if (!log) return

        let type = 'Log'
        let from = '-'
        let to = '-'
        let value = '-'
        let alert = false

        const parsed = iface.parseLog({ topics: log.topics, data: log.data })
        if (parsed) {
          type = parsed.name

          if (parsed.name === 'Transfer') {
            const amount = formatUnits(parsed.args.value, 6)
            const numAmount = Number(amount)
            from = shortAddr(parsed.args.from)
            to = shortAddr(parsed.args.to)
            value = `${amount} USDC`

            alert = analytics.isAnomaly(numAmount)
            analytics.addValue(numAmount)
          } else if (parsed.name === 'Approval') {
            const amount = formatUnits(parsed.args.value, 6)
            from = shortAddr(parsed.args.owner)
            to = shortAddr(parsed.args.spender)
            value = `${amount} USDC`
          }
        } else {
          const topic0 = typeof log.topics?.[0] === 'string' ? log.topics[0] : ''
          type = topic0 ? `Log ${topic0.slice(0, 10)}...` : 'Log'
        }

        send({
          kind: 'event',
          event: {
            id: `${log.transactionHash}:${log.logIndex}`,
            type,
            from,
            to,
            value,
            timestamp: Date.now(),
            alert
          }
        })
      })

      ws.on('close', () => {
        send({ kind: 'status', connected: false })
        isClosed = true
        controller.close()
      })

      ws.on('error', () => {
        send({ kind: 'status', connected: false })
        isClosed = true
        controller.close()
      })

      const heartbeat = setInterval(() => {
        if (!isClosed) {
          send({ kind: 'ping', timestamp: Date.now() })
        }
      }, 15000)

      ;(controller as any)._cleanup = () => {
        clearInterval(heartbeat)
        isClosed = true
        ws.close()
      }
    },
    cancel() {
      const cleanup = (this as any)?._cleanup
      if (typeof cleanup === 'function') cleanup()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    }
  })
}