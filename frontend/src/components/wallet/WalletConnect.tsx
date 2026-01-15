'use client'

import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { useState, useEffect } from 'react'
import { Wallet, ChevronDown, LogOut, Network } from 'lucide-react'

export function WalletConnect() {
  const { address, isConnected, status } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { chains, switchChain } = useSwitchChain()
  const [showConnectors, setShowConnectors] = useState(false)
  const [showNetworks, setShowNetworks] = useState(false)


  const currentChain = chains.find(chain => chain.id === chainId)

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isConnected && address && status === 'connected') {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative">
          <button
            onClick={() => setShowNetworks(!showNetworks)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            <Network className="h-4 w-4 text-primary" />
            <span className="text-sm">{currentChain?.name || 'Unknown'}</span>
            <ChevronDown className="h-4 w-4 ml-auto" />
          </button>
          
          {showNetworks && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg z-50">
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => {
                    switchChain({ chainId: chain.id })
                    setShowNetworks(false)
                  }}
                  className={`w-full px-4 py-2 text-left hover:bg-neutral-700 first:rounded-t-lg last:rounded-b-lg ${
                    chain.id === chainId ? 'bg-neutral-700 text-primary' : ''
                  }`}
                >
                  <div className="text-sm font-medium">{chain.name}</div>
                  <div className="text-xs text-muted-foreground">Chain ID: {chain.id}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg">
          <Wallet className="h-4 w-4 text-primary" />
          <span className="text-sm font-mono">{formatAddress(address)}</span>
          <button
            onClick={() => disconnect()}
            className="ml-auto p-1 hover:bg-neutral-700 rounded transition-colors"
            title="Disconnect"
          >
            <LogOut className="h-4 w-4 text-red-400" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowConnectors(!showConnectors)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
      >
        <Wallet className="h-4 w-4" />
        <span className="text-sm font-medium">Connect Wallet</span>
      </button>

      {showConnectors && (
        <div className="absolute top-full mt-2 right-0 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg min-w-[200px] z-50">
          {connectors.map((connector) => (
            <button
              key={connector.id}
              onClick={async () => {
                try {
                  await connect({ connector })
                  setShowConnectors(false)
                } catch (error) {
                  console.error('Failed to connect wallet:', error)
                }
              }}
              className="w-full px-4 py-3 text-left hover:bg-neutral-700 first:rounded-t-lg last:rounded-b-lg"
            >
              <div className="text-sm font-medium">{connector.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
