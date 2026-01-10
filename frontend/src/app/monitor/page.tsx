'use client'

import { useEffect, useState } from 'react'
import { Bell, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react'

interface Event {
  id: string
  type: string
  from: string
  to: string
  value: string
  timestamp: number
  alert: boolean
}

type StreamMessage =
  | { kind: 'status'; connected: boolean }
  | { kind: 'event'; event: Event }
  | { kind: 'ping' }

export default function MonitorPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/monitor/stream')

    es.onmessage = (e) => {
      const msg: StreamMessage = JSON.parse(e.data)

      if (msg.kind === 'status') {
        setConnected(msg.connected)
      }

      if (msg.kind === 'event') {
        setEvents((prev) => [msg.event, ...prev].slice(0, 50))
      }
    }

    es.onerror = () => setConnected(false)

    return () => es.close()
  }, [])

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Contract Monitor</h1>
            <p className="text-muted-foreground mt-2">
              Real-time monitoring powered by Alchemy
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded-full ${
                connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-muted-foreground">
              {connected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-card">
            <div className="text-sm text-muted-foreground">Events Today</div>
            <div className="text-3xl font-bold mt-1">{events.length}</div>
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <div className="text-sm text-muted-foreground">Alerts</div>
            <div className="text-3xl font-bold mt-1 text-yellow-500">
              {events.filter((e) => e.alert).length}
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <div className="text-sm text-muted-foreground">
              Contracts Monitored
            </div>
            <div className="text-3xl font-bold mt-1">1</div>
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Events</h2>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              Configure Alerts
            </button>
          </div>

          <div className="divide-y">
            {events.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Waiting for events...
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`p-4 flex items-center justify-between ${
                    event.alert ? 'bg-yellow-500/5' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {event.alert ? (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    ) : event.type === 'Transfer' ? (
                      <ArrowUpRight className="h-5 w-5 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5 text-blue-500" />
                    )}

                    <div>
                      <div className="font-medium">{event.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.from} → {event.to}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">{event.value}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}