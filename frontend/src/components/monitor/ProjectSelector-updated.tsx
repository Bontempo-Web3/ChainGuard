'use client'

import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, FileCode, Github, FolderUp, CheckCircle } from 'lucide-react'

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

interface ProjectSelectorProps {
  projects: Project[]
  selectedProject: Project | null
  onSelectProject: (project: Project) => void
}

export function ProjectSelector({ projects, selectedProject, onSelectProject }: ProjectSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'github':
        return <Github className="h-4 w-4" />
      case 'zip':
        return <FolderUp className="h-4 w-4" />
      case 'deployed':
        return <CheckCircle className="h-4 w-4" />
      default:
        return <FileCode className="h-4 w-4" />
    }
  }

  if (projects.length === 0) {
    return (
      <div className="border border-border rounded-lg px-4 py-2 bg-secondary/50">
        <div className="text-sm text-muted-foreground">
          No deployed contracts to monitor
        </div>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-3 px-4 py-2 border border-border rounded-lg hover:bg-secondary/50 transition-colors min-w-[320px]"
      >
        <div className="flex items-center gap-2">
          {selectedProject ? (
            <>
              {getProjectIcon(selectedProject.projectType)}
              <span className="font-medium">{selectedProject.projectName}</span>
              {selectedProject.contracts[0] && (
                <span className="text-xs text-muted-foreground">
                  ({selectedProject.contracts[0].network})
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">Select a project to monitor</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-[400px] overflow-y-auto">
          <div className="p-2">
            <div className="text-xs font-medium text-muted-foreground px-2 py-1.5">
              DEPLOYED CONTRACTS ({projects.length})
            </div>
            
            {projects.map((project) => {
              const contract = project.contracts[0]
              const isSelected = selectedProject?.id === project.id
              
              return (
                <button
                  key={project.id}
                  onClick={() => {
                    onSelectProject(project)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-2 py-2 rounded-md hover:bg-secondary/50 transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-secondary' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getProjectIcon(project.projectType)}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.projectName}</div>
                      {contract && (
                        <div className="text-xs text-muted-foreground truncate">
                          {contract.contractAddress.slice(0, 10)}...{contract.contractAddress.slice(-8)} · {contract.network}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
