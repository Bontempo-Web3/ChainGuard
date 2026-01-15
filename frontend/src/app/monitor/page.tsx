'use client'

import { useEffect, useState } from 'react'
import { Bell, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react'
import { LandingPage } from '@/components/layout/LandingPage'
import { ProjectSelector } from '@/components/monitor/ProjectSelector'

interface Contract {
  id: number
  projectId: number
  contractAddress: string
  network: string
  chainId: string
  contractName: string
  tokenDecimals: number | null
  deploymentId: number | null
  createdAt: Date
  updatedAt: Date
}

interface Project {
  id: number
  userId: number
  projectName: string
  description: string | null
  projectType: 'github' | 'zip' | 'deployed'
  githubRepoUrl: string | null
  githubRepoPath: string | null
  zipFilePath: string | null
  scanApproved: boolean
  isDeployed: boolean
  createdAt: Date
  updatedAt: Date
  contracts: Contract[]
}

interface Event {
  id: string
  type: string
  from: string
  to: string
  value: string
  timestamp: number
  alert: boolean
}

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

type StreamMessage =
  | { kind: 'status'; connected: boolean }
  | { kind: 'event'; event: Event }
  | { kind: 'ping' }

function MonitorPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [connected, setConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const alertEvents = events.filter((e) => e.alert)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/user`, {
        credentials: 'include'
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setIsAuthenticated(true)
        
        await fetchProjects()
      } else {
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/projects`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        
        // Filter only deployed projects (they already have contracts joined)
        const deployedProjects = data.filter((p: Project) => p.isDeployed)
        
        setProjects(deployedProjects)
        
        // Auto-select first deployed project
        if (deployedProjects.length > 0) {
          setSelectedProject(deployedProjects[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return

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
  }, [isAuthenticated])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LandingPage />
  }

  const deployedProjectsCount = projects.filter(p => p.isDeployed).length

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

        <div className="flex items-center justify-between">
          <ProjectSelector
            projects={projects}
            selectedProject={selectedProject}
            onSelectProject={setSelectedProject}
          />

          {selectedProject && selectedProject.contracts[0] && (
            <div className="flex items-center gap-4 text-sm">
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Address:</span>{' '}
                <code className="font-mono">{selectedProject.contracts[0].contractAddress}</code>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Network:</span>{' '}
                {selectedProject.contracts[0].network.charAt(0).toUpperCase() + selectedProject.contracts[0].network.slice(1)}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="border rounded-lg p-4 bg-card">
            <div className="text-sm text-muted-foreground">Events Today</div>
            <div className="text-3xl font-bold mt-1">{events.length}</div>
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <div className="text-sm text-muted-foreground">Alerts</div>
            <div className="text-3xl font-bold mt-1 text-yellow-500">
              {alertEvents.length}
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-card">
            <div className="text-sm text-muted-foreground">
              Contracts Monitored
            </div>
            <div className="text-3xl font-bold mt-1">{deployedProjectsCount}</div>
          </div>
        </div>

        {alertEvents.length > 0 && (
          <div className="border rounded-lg bg-card border-yellow-500/50">
            <div className="p-4 border-b flex items-center justify-between bg-yellow-500/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <h2 className="text-lg font-semibold">Anomaly Alerts</h2>
              </div>
              <span className="text-sm text-muted-foreground">
                ML-based anomaly detection
              </span>
            </div>

            <div className="divide-y">
              {alertEvents.map((event) => (
                <div
                  key={event.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />

                    <div>
                      <div className="font-medium">{event.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.from} → {event.to}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium text-yellow-500">{event.value}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border rounded-lg bg-card">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Live Events</h2>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              Configure Alerts
            </button>
          </div>

          <div className="divide-y">
            {!selectedProject ? (
              <div className="p-8 text-center text-muted-foreground">
                Select a deployed project to view events
              </div>
            ) : events.length === 0 ? (
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

export default MonitorPage