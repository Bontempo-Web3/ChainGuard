'use client'

import { useState, useEffect } from 'react'
import { X, Github, Loader2, ExternalLink, Check } from 'lucide-react'

interface GitHubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  description: string | null
  language: string | null
  updated_at: string
}

interface GithubConnectModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: { 
    repoUrl: string
    repoName: string
    repoPath: string
    description: string 
  }) => void
}

export function GithubConnectModal({ isOpen, onClose, onSubmit }: GithubConnectModalProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [repoPath, setRepoPath] = useState('./')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<{ repo?: string; path?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchRepos()
    }
  }, [isOpen])

  const fetchRepos = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/repos`, {
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }
      
      const data = await response.json()
      setRepos(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRepoSelect = (repo: GitHubRepo) => {
    setSelectedRepo(repo)
    setDescription(repo.description || '')
    setErrors(prev => ({ ...prev, repo: undefined }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: { repo?: string; path?: string } = {}
    
    if (!selectedRepo) {
      newErrors.repo = 'Please select a repository'
    }
    
    if (!repoPath.trim()) {
      newErrors.path = 'Repository path is required'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    setIsSubmitting(true)
    onSubmit({
      repoUrl: selectedRepo!.html_url,
      repoName: selectedRepo!.full_name,
      repoPath,
      description
    })
  }

  const handleClose = () => {
    setSelectedRepo(null)
    setRepoPath('./')
    setDescription('')
    setErrors({})
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-3xl max-h-[90vh] flex flex-col relative">
        {isSubmitting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Cloning repository...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold">Connect GitHub Repository</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a repository to add to ChainGuard
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3">
                Select Repository *
              </label>
              
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-500">
                  {error}
                </div>
              )}

              {!loading && !error && repos.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Github className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No repositories found</p>
                </div>
              )}

              {!loading && !error && repos.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto border border-border rounded-lg">
                  {repos.map((repo) => (
                    <button
                      key={repo.id}
                      type="button"
                      onClick={() => handleRepoSelect(repo)}
                      disabled={isSubmitting}
                      className={`w-full text-left p-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        selectedRepo?.id === repo.id
                          ? 'bg-primary/10 border-l-4 border-l-primary'
                          : 'hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">{repo.full_name}</span>
                            {repo.private && (
                              <span className="px-2 py-0.5 text-xs border border-border rounded-full flex-shrink-0">
                                Private
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            {repo.language && (
                              <span className="flex items-center gap-1">
                                <span className="h-2 w-2 rounded-full bg-primary"></span>
                                {repo.language}
                              </span>
                            )}
                            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {selectedRepo?.id === repo.id && (
                          <Check className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {errors.repo && (
                <p className="text-red-500 text-sm mt-2">{errors.repo}</p>
              )}
            </div>

            {selectedRepo && (
              <>
                <div>
                  <label htmlFor="repoPath" className="block text-sm font-medium mb-2">
                    Contracts Path *
                  </label>
                  <input
                    id="repoPath"
                    type="text"
                    value={repoPath}
                    onChange={(e) => {
                      setRepoPath(e.target.value)
                      setErrors(prev => ({ ...prev, path: undefined }))
                    }}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Path to your Solidity contracts directory
                  </p>
                  {errors.path && (
                    <p className="text-red-500 text-sm mt-1">{errors.path}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Brief description of your project..."
                    rows={3}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 p-6 border-t border-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-border rounded-md hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedRepo || isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect Repository
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}