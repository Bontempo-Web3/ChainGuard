'use client'

import { useState, useEffect, useRef } from 'react'
import { FolderUp, Github, FileCode, CheckCircle, ExternalLink, Edit2, Trash2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { LandingPage } from '@/components/layout/LandingPage'
import { UploadProjectModal } from '@/components/modals/UploadProjectModal'
import { GithubConnectModal } from '@/components/modals/GithubConnectModal'
import { MonitorContractModal } from '@/components/modals/MonitorContractModal'
import { DeleteConfirmModal } from '@/components/modals/DeleteConfirmModal'

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

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false)
  const [isMonitorModalOpen, setIsMonitorModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: number; name: string } | null>(null)
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
        
        // Fetch projects after authentication
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
        setProjects(data)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const handleDeleteProject = async (projectId: number, projectName: string) => {
    setProjectToDelete({ id: projectId, name: projectName })
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!projectToDelete) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete project')
      }

      // Remove project from state
      setProjects(prev => prev.filter(p => p.id !== projectToDelete.id))
      
      console.log('Project deleted successfully')
    } catch (error: any) {
      console.error('Delete error:', error)
      alert(`Failed to delete project: ${error.message}`)
    } finally {
      setProjectToDelete(null)
    }
  }

  const handleUploadClick = () => {
    setIsUploadModalOpen(true)
  }

  const handleUploadSubmit = async (data: { name: string; description: string; file: File }) => {
    try {
      const formData = new FormData()
      formData.append('name', data.name)
      formData.append('description', data.description)
      formData.append('file', data.file)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/projects/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to upload project')
      }

      const result = await response.json()
      console.log('Project uploaded successfully:', result)

      // Reload the page to show the new project
      window.location.reload()
    } catch (error: any) {
      console.error('Upload error:', error)
      alert(`Failed to upload project: ${error.message}`)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('Files selected:', files)
    }
  }

  const handleGithubConnect = () => {
    setIsGithubModalOpen(true)
  }

  const handleGithubSubmit = async (data: { 
    repoUrl: string
    repoName: string
    repoPath: string
    description: string 
  }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/projects/github`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoUrl: data.repoUrl,
          repoName: data.repoName,
          repoPath: data.repoPath,
          description: data.description
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to connect repository')
      }

      const result = await response.json()
      console.log('Repository connected successfully:', result)

      // Reload the page to show the new project
      window.location.reload()
    } catch (error: any) {
      console.error('GitHub connect error:', error)
      alert(`Failed to connect repository: ${error.message}`)
    }
  }

  const handleMonitorSubmit = async (data: {
    contractName: string
    contractAddress: string
    network: string
    chainId: string
    tokenDecimals?: string
  }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/projects/monitor`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractName: data.contractName,
          contractAddress: data.contractAddress,
          network: data.network,
          chainId: data.chainId,
          tokenDecimals: data.tokenDecimals
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add contract to monitoring')
      }

      const result = await response.json()
      console.log('Contract added successfully:', result)

      // Reload the page to show the new project
      window.location.reload()
    } catch (error: any) {
      console.error('Monitor contract error:', error)
      alert(`Failed to add contract: ${error.message}`)
    }
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

      <div className="grid grid-cols-3 gap-6 mb-8">
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

        <button
          onClick={() => setIsMonitorModalOpen(true)}
          className="group flex flex-col items-center justify-center gap-4 p-8 rounded-lg border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all cursor-pointer"
        >
          <div className="p-4 rounded-full bg-secondary group-hover:bg-primary/20 transition-colors">
            <CheckCircle className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-center">
            <div className="font-medium mb-1">Monitor Contract</div>
            <div className="text-sm text-muted-foreground">Track deployed smart contracts</div>
          </div>
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Projects</h2>
          <Link href="/scan" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        
        {projects.length === 0 ? (
          <div className="rounded-lg border border-border p-12 text-center">
            <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-1">No projects yet</p>
            <p className="text-sm text-muted-foreground">Create your first project using one of the options above</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Project</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Network</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Created</th>
                  <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => {
                  const contract = project.contracts[0]
                  return (
                    <tr 
                      key={project.id} 
                      className="hover:bg-secondary/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <FileCode className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">{project.projectName}</div>
                            {project.description && (
                              <div className="text-xs text-muted-foreground truncate max-w-xs">
                                {project.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-secondary">
                          {project.projectType === 'github' && <Github className="h-3 w-3 mr-1" />}
                          {project.projectType === 'zip' && <FolderUp className="h-3 w-3 mr-1" />}
                          {project.projectType === 'deployed' && <CheckCircle className="h-3 w-3 mr-1" />}
                          {project.projectType.charAt(0).toUpperCase() + project.projectType.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {project.isDeployed && contract ? (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <span className="h-2 w-2 rounded-full bg-green-500"></span>
                            {contract.network.charAt(0).toUpperCase() + contract.network.slice(1)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not deployed</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {project.scanApproved ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-500">
                              <CheckCircle className="h-3 w-3" />
                              Scanned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <XCircle className="h-3 w-3" />
                              Not scanned
                            </span>
                          )}
                          {project.isDeployed && (
                            <span className="inline-flex items-center gap-1.5 text-xs text-green-500">
                              <CheckCircle className="h-3 w-3" />
                              Deployed
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-1.5 hover:bg-secondary rounded transition-colors"
                            title="Edit project"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id, project.projectName)}
                            className="p-1.5 hover:bg-secondary rounded transition-colors"
                            title="Delete project"
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UploadProjectModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSubmit={handleUploadSubmit}
      />

      <GithubConnectModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onSubmit={handleGithubSubmit}
      />

      <MonitorContractModal
        isOpen={isMonitorModalOpen}
        onClose={() => setIsMonitorModalOpen(false)}
        onSubmit={handleMonitorSubmit}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setProjectToDelete(null)
        }}
        onConfirm={confirmDelete}
        projectName={projectToDelete?.name || ''}
      />
    </div>
  )
}