'use client'

import { useState, useEffect } from 'react'
import { Github, Copy, Loader2, ExternalLink, X, Check } from 'lucide-react'
import Link from 'next/link'

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

interface User {
  login: string
  name: string
  avatar_url: string
}

const CHAINGUARD_WORKFLOW = `name: ChainGuard Security Scan

on:
  push:
    branches: [ main, develop, master ]
    paths:
      - '**/*.sol'
  pull_request:
    branches: [ main, develop, master ]
    paths:
      - '**/*.sol'

jobs:
  security-scan:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Run ChainGuard Security Scan
        uses: Bontempo-Web3/ChainGuard@v1
        with:
          contracts-path: './contracts'
          
      - name: Upload Scan Results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: chainguard-results
          path: chainguard-results.json
`

export default function ReposPage() {
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchUser()
    fetchRepos()
  }, [])

  const fetchUser = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/auth/user', {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setUser(data)
      }
    } catch (err) {
      console.error('Error fetching user:', err)
    }
  }

  const fetchRepos = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/repos', {
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

  const handleShowWorkflow = (repo: GitHubRepo) => {
    setSelectedRepo(repo)
    setCopied(false)
  }

  const handleCopyWorkflow = async () => {
    try {
      await navigator.clipboard.writeText(CHAINGUARD_WORKFLOW)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const closeModal = () => {
    setSelectedRepo(null)
    setCopied(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-500">Error: {error}</p>
          <Link href="/" className="text-primary hover:underline mt-2 inline-block">
            Go back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Your Repositories</h1>
          {user && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <img src={user.avatar_url} alt={user.name} className="h-8 w-8 rounded-full" />
              <span>{user.name} (@{user.login})</span>
            </div>
          )}
        </div>
        <Link
          href="/"
          className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
        >
          Back to Home
        </Link>
      </div>

      <div className="grid gap-4">
        {repos.map((repo) => (
          <div
            key={repo.id}
            className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Github className="h-5 w-5 text-muted-foreground" />
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold hover:text-primary transition-colors flex items-center gap-2"
                  >
                    {repo.full_name}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {repo.private && (
                    <span className="px-2 py-0.5 text-xs border border-border rounded-full">
                      Private
                    </span>
                  )}
                </div>
                
                {repo.description && (
                  <p className="text-muted-foreground mb-3">{repo.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-primary"></span>
                      {repo.language}
                    </span>
                  )}
                  <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                onClick={() => handleShowWorkflow(repo)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                <Copy className="h-4 w-4" />
                Select
              </button>
            </div>
          </div>
        ))}
      </div>

      {repos.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Github className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No repositories found</p>
        </div>
      )}

      {selectedRepo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">ChainGuard Workflow</h2>
                <p className="text-sm text-muted-foreground">
                  Add this to <code className="bg-secondary px-1 rounded">{selectedRepo.full_name}/.github/workflows/chainguard.yml</code>
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-auto max-h-[60vh]">
              <pre className="bg-secondary p-4 rounded-lg text-sm overflow-x-auto">
                <code>{CHAINGUARD_WORKFLOW}</code>
              </pre>
            </div>
            
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Copy and paste into your repository
              </p>
              <button
                onClick={handleCopyWorkflow}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Workflow
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
