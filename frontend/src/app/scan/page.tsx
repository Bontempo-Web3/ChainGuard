'use client'

import { useState } from 'react'
import { Shield, Upload, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface ScanResult {
  status: string
  vulnerabilities: any[]
  summary: {
    total: number
    by_severity: {
      critical: number
      high: number
      medium: number
      low: number
      informational: number
    }
    by_tool: Record<string, number>
  }
  scan_duration: number
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mockProject = {
    id: process.env.NEXT_PUBLIC_MOCK_PROJECT_ID || '1',
    name: process.env.NEXT_PUBLIC_MOCK_PROJECT_NAME || 'GridTradingBot',
    path: process.env.NEXT_PUBLIC_MOCK_PROJECT_PATH || '/path/to/project',
    type: process.env.NEXT_PUBLIC_MOCK_PROJECT_TYPE || 'github',
  }

  const handleScan = async () => {
    setScanning(true)
    setError(null)
    setResults(null)

    try {
      console.log('Starting scan for:', mockProject.name)
      console.log('Project path:', mockProject.path)

      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectPath: mockProject.path,
          projectName: mockProject.name,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Scan failed')
      }

      const result = await response.json()
      console.log('Scan completed:', result)
      setResults(result)
    } catch (err: any) {
      console.error('Scan error:', err)
      setError(err.message || 'Failed to scan project')
    } finally {
      setScanning(false)
    }
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Mock Project</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {mockProject.name} ({mockProject.type})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Path: {mockProject.path}
                </p>
              </div>
              <Shield className="h-12 w-12 text-primary" />
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={handleScan}
                disabled={scanning}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {scanning ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  'Start Security Scan'
                )}
              </button>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
          </div>
        </div>

        {results && (
          <div className="border border-border rounded-lg p-6 bg-card space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Scan Results</h2>
              <div className="text-sm text-muted-foreground">
                Duration: {results.scan_duration.toFixed(2)}s
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-muted-foreground">Critical</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary.by_severity.critical}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <span className="text-sm text-muted-foreground">High</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary.by_severity.high}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-muted-foreground">Medium</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary.by_severity.medium}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Low</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary.by_severity.low}</p>
              </div>

              <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-gray-500" />
                  <span className="text-sm text-muted-foreground">Info</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary.by_severity.informational}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Vulnerabilities</span>
                <span className="text-lg font-semibold">{results.summary.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tools Used</span>
                <span className="text-sm">{Object.keys(results.summary.by_tool).join(', ')}</span>
              </div>
            </div>

            {results.vulnerabilities.length > 0 && (
              <div className="pt-4 border-t border-border space-y-3">
                <h3 className="font-medium">Vulnerabilities</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {results.vulnerabilities.slice(0, 10).map((vuln, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-muted border border-border">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded ${
                              vuln.severity === 'critical' ? 'bg-red-500/20 text-red-500' :
                              vuln.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
                              vuln.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                              vuln.severity === 'low' ? 'bg-blue-500/20 text-blue-500' :
                              'bg-gray-500/20 text-gray-500'
                            }`}>
                              {vuln.severity?.toUpperCase()}
                            </span>
                            <span className="text-xs text-muted-foreground">{vuln.tool}</span>
                          </div>
                          <p className="text-sm font-medium mt-2">{vuln.title || vuln.description}</p>
                          {vuln.location && (
                            <p className="text-xs text-muted-foreground mt-1">{vuln.location}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {results.vulnerabilities.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      Showing 10 of {results.vulnerabilities.length} vulnerabilities
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
