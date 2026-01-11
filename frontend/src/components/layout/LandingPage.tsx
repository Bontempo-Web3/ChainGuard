'use client'

import { Github } from 'lucide-react'

export function LandingPage() {
  const handleGithubLogin = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/github`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-2xl w-full text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-5xl font-bold tracking-tight">
            Welcome to ChainGuard
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            Secure your Web3 projects with automated vulnerability scanning, safe deployment, and real-time monitoring
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Vulnerability Scanning</h3>
            <p className="text-sm text-muted-foreground">
              Automatically detect security vulnerabilities in your smart contracts
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Secure Deployment</h3>
            <p className="text-sm text-muted-foreground">
              Deploy your contracts safely with built-in security checks
            </p>
          </div>

          <div className="p-6 rounded-lg border border-border bg-card">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
            <p className="text-sm text-muted-foreground">
              Monitor your deployed contracts for suspicious activity
            </p>
          </div>
        </div>
        
        <button
          onClick={handleGithubLogin}
          className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-lg border border-border bg-card hover:bg-secondary/50 hover:border-primary/50 transition-all cursor-pointer text-lg font-medium"
        >
          <Github className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
          <span>Sign in with GitHub to get started</span>
        </button>

        <p className="text-sm text-muted-foreground">
          Connect your GitHub account to access your repositories and start securing your Web3 projects
        </p>
      </div>
    </div>
  )
}