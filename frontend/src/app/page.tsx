'use client'

import { useState, useEffect, useRef } from 'react'
import { FolderUp, Github, FileCode, CheckCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { LandingPage } from '@/components/layout/LandingPage'

interface Project {
  id: string
  name: string
  address: string
  txHash: string
  network: string
  timestamp: number
  status: 'success' | 'pending' | 'failed'
}

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

const DEMO_PROJECTS: Project[] = [
  { id: '1', name: 'SimpleVault', address: '0x1234...5678', txHash: '0xabcd...efgh', network: 'Sepolia', timestamp: Date.now() - 180000, status: 'success' },
  { id: '2', name: 'TokenFactory', address: '0x8765...4321', txHash: '0xijkl...mnop', network: 'Mainnet', timestamp: Date.now() - 300000, status: 'success' },
  { id: '3', name: 'NFTMarketplace', address: '0xfedc...ba98', txHash: '0xqrst...uvwx', network: 'Polygon', timestamp: Date.now() - 420000, status: 'success' },
]

export default function Home() {
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('Files selected:', files)
    }
  }

  const handleGithubConnect = () => {
    window.location.href = '/repos'
  }

  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes} minutes ago`
    return `${Math.floor(minutes / 60)} hours ago`
  }

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.login}</h1>
          <p className="text-sm text-muted-foreground">Manage your Web3 security projects</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".sol,.json"
          multiple
          className="hidden"
        />
        
        <button
          onClick={handleUploadClick}
          className="group flex flex-col items-center justify-center gap-4 p-8 rounded-lg border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all cursor-pointer"
        >
          <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/20 transition-colors">
            <FolderUp className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <div className="font-medium mb-1">Upload Project</div>
            <div className="text-sm text-muted-foreground">Drop your Solidity files or folder</div>
          </div>
        </button>

        <button
          onClick={handleGithubConnect}
          className="group flex flex-col items-center justify-center gap-4 p-8 rounded-lg border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all cursor-pointer"
        >
          <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/20 transition-colors">
            <Github className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <div className="font-medium mb-1">Connect GitHub</div>
            <div className="text-sm text-muted-foreground">Import from your repositories</div>
          </div>
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Latest Projects</h2>
          <Link href="/scan" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Project</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Contract</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Network</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {projects.map((project) => (
                <tr 
                  key={project.id} 
                  className="hover:bg-secondary/30 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileCode className="h-4 w-4 text-primary" />
                      <span className="font-medium">{project.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-muted-foreground font-mono">{project.address}</code>
                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary cursor-pointer" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm">
                      <span className="h-2 w-2 rounded-full bg-green-500"></span>
                      {project.network}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-500">
                      <CheckCircle className="h-4 w-4" />
                      Deployed
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-muted-foreground" suppressHydrationWarning>
                    {formatTime(project.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
