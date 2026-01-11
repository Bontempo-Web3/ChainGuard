'use client'

import { useState, useEffect } from 'react'
import { Shield, Upload, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { LandingPage } from '@/components/layout/LandingPage'

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

  const handleScan = async () => {
    setScanning(true)
    // TODO: Implement scan logic
    setTimeout(() => {
      setResults({
        status: 'completed',
        tools: ['Slither', 'Aderyn', 'Claude Mini-Audit'],
        findings: {
          critical: 0,
          high: 1,
          medium: 3,
          low: 5
        }
      })
      setScanning(false)
    }, 2000)
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
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold">Security Scanner</h1>
          <p className="text-muted-foreground mt-2">
            Analyze your smart contracts with Slither, Aderyn, Echidna, and Claude Mini-Audit
          </p>
        </div>

        <div className="border border-border rounded-lg p-8 bg-card">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Upload className="h-16 w-16 text-muted-foreground" />
            <p className="text-lg">Drop your .sol files here or click to upload</p>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
            >
              {scanning ? 'Scanning...' : 'Start Scan'}
            </button>
          </div>
        </div>

        {results && (
          <div className="border border-border rounded-lg p-6 bg-card space-y-4">
            <h2 className="text-xl font-semibold">Scan Results</h2>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-muted-foreground">Critical</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.findings.critical}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-sm text-muted-foreground">High</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.findings.high}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Medium</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.findings.medium}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">Low</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.findings.low}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Tools used: {results.tools.join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
