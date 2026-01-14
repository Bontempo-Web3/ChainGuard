'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { LandingPage } from '@/components/layout/LandingPage'

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

interface BusinessRule {
  id: string
  category: string
  description: string
  code_reference: string
  testable: boolean
  test_hint: string
}

interface ScanResult {
  status: string
  vulnerabilities: any[]
  summary: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
    by_source: Record<string, number>
  }
  business_rules?: {
    contract_name?: string
    rules: BusinessRule[]
    summary?: {
      total_rules: number
      by_category: Record<string, number>
    }
    error?: string
  }
  scan_duration: number
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(false)
  const [results, setResults] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogs, setShowLogs] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set())
  const [generatingTests, setGeneratingTests] = useState(false)
  const [testGenResult, setTestGenResult] = useState<any>(null)

  const handleGenerateTests = async () => {
    if (!results?.business_rules?.rules || selectedRules.size === 0) return
    
    setGeneratingTests(true)
    setTestGenResult(null)
    
    try {
      const selectedRulesList = results.business_rules.rules.filter(r => selectedRules.has(r.id))
      
      const response = await fetch('/api/generate-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repository: mockProject.repository,
          commit: mockProject.commit,
          branch: 'main',
          selected_rules: selectedRulesList,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Test generation failed')
      }
      
      setTestGenResult(data)
    } catch (err: any) {
      setTestGenResult({ status: 'error', error: err.message })
    } finally {
      setGeneratingTests(false)
    }
  }

  const toggleRule = (ruleId: string) => {
    setSelectedRules(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId)
      } else {
        newSet.add(ruleId)
      }
      return newSet
    })
  }

  const selectAllRules = () => {
    if (results?.business_rules?.rules) {
      setSelectedRules(new Set(results.business_rules.rules.map(r => r.id)))
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      access_control: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
      financial: 'bg-green-500/20 text-green-500 border-green-500/30',
      state_invariant: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
      user_flow: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
      integration: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
    }
    return colors[category] || 'bg-gray-500/20 text-gray-500 border-gray-500/30'
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      access_control: 'Access Control',
      financial: 'Financial',
      state_invariant: 'State Invariant',
      user_flow: 'User Flow',
      integration: 'Integration',
    }
    return labels[category] || category
  }

  // TODO: Replace mock with real data from PostgreSQL
  // When PostgreSQL is implemented:
  // 1. Fetch user's project list from database
  // 2. Allow user to select project from list
  // 3. Use repository and commit from selected project
  // 4. Save scan results to database (scans table)
  // 5. Link scan to project (project_id) and user (user_id)
  const mockProject = {
    id: process.env.NEXT_PUBLIC_MOCK_PROJECT_ID || '1',
    name: process.env.NEXT_PUBLIC_MOCK_PROJECT_NAME || 'GridTradingBot',
    repository: process.env.NEXT_PUBLIC_MOCK_PROJECT_GITHUB_URL || 'https://github.com/MariliaBontempo/GridTradingBot',
    commit: process.env.NEXT_PUBLIC_MOCK_PROJECT_COMMIT || 'main',
    type: process.env.NEXT_PUBLIC_MOCK_PROJECT_TYPE || 'github',
  }

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
    setError(null)
    setResults(null)
    setLogs([])

    try {
      const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
      }

      addLog(`Starting scan for: ${mockProject.name}`)
      addLog(`Repository: ${mockProject.repository}`)
      addLog(`Commit: ${mockProject.commit}`)

      addLog('Sending scan request to backend...')
      
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repository: mockProject.repository,
          commit: mockProject.commit,
          branch: 'main',
          projectName: mockProject.name,
        }),
      })

      addLog(`Response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json()
        addLog(`Error: ${errorData.error || 'Scan failed'}`)
        throw new Error(errorData.error || 'Scan failed')
      }

      addLog('Parsing scan results...')
      const result = await response.json()
      addLog(`Scan completed successfully!`)
      addLog(`Found ${result.summary?.total || 0} vulnerabilities`)
      addLog(`Duration: ${result.scan_duration?.toFixed(2) || 0}s`)
      
      // Log business rules info
      if (result.business_rules) {
        const rulesCount = result.business_rules.rules?.length || 0
        addLog(`Business rules inferred: ${rulesCount}`)
        if (result.business_rules.error) {
          addLog(`Business rules error: ${result.business_rules.error}`)
        }
      } else {
        addLog('No business rules in response')
      }
      
      console.log('Full scan result:', result)
      console.log('Business rules:', result.business_rules)
      
      setResults(result)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to scan project'
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ERROR: ${errorMsg}`])
      setError(errorMsg)
    } finally {
      setScanning(false)
    }
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
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Mock Project</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {mockProject.name} ({mockProject.type})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Repository: {mockProject.repository}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Commit: {mockProject.commit}
                </p>
              </div>
              <Shield className="h-12 w-12 text-primary" />
            </div>

            <div className="pt-4 border-t border-border space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showLogs"
                  checked={showLogs}
                  onChange={(e) => setShowLogs(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                <label htmlFor="showLogs" className="text-sm text-muted-foreground cursor-pointer">
                  Show logs
                </label>
              </div>

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

        {showLogs && logs.length > 0 && (
          <div className="border border-border rounded-lg p-6 bg-card">
            <h3 className="text-lg font-semibold mb-4">Scan Logs</h3>
            <div className="bg-black/90 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto">
              {logs.map((log, idx) => (
                <div key={idx} className="text-green-400 mb-1">
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}

        {results && (
          <div className="border border-border rounded-lg p-6 bg-card space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Scan Results</h2>
              <div className="text-sm text-muted-foreground">
                Duration: {results.scan_duration?.toFixed(2) || 0}s
              </div>
            </div>
            
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Critical</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary?.critical || 0}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">High</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary?.high || 0}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Medium</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary?.medium || 0}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Low</span>
                </div>
                <p className="text-2xl font-bold mt-2">{results.summary?.low || 0}</p>
              </div>

              <div className="p-4 rounded-lg bg-gray-500/10 border border-gray-500/20">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Info</span>
                </div>
                <p className="text-2xl font-bold mt-2">0</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Vulnerabilities</span>
                <span className="text-lg font-semibold">{results.summary?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tools Used</span>
                <span className="text-sm">{results.summary?.by_source ? Object.keys(results.summary.by_source).join(', ') : 'N/A'}</span>
              </div>
            </div>

            {results.vulnerabilities && results.vulnerabilities.length > 0 && (
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

            {results.business_rules && results.business_rules.rules && results.business_rules.rules.length > 0 && (
              <div className="pt-4 border-t border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Inferred Business Rules</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select the rules you want to generate tests for
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedRules.size} / {results.business_rules.rules.length} selected
                    </span>
                    <button
                      onClick={selectAllRules}
                      className="text-xs px-2 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30"
                    >
                      Select All
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {results.business_rules.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedRules.has(rule.id)
                          ? 'bg-primary/10 border-primary/50'
                          : 'bg-muted border-border hover:border-primary/30'
                      }`}
                      onClick={() => toggleRule(rule.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedRules.has(rule.id)}
                          onChange={() => toggleRule(rule.id)}
                          className="mt-1 w-4 h-4 rounded border-border"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded border ${getCategoryColor(rule.category)}`}>
                              {getCategoryLabel(rule.category)}
                            </span>
                            {rule.testable && (
                              <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500 border border-green-500/20">
                                Testable
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium">{rule.description}</p>
                          {rule.code_reference && (
                            <p className="text-xs text-muted-foreground mt-2 font-mono bg-black/30 px-2 py-1 rounded">
                              {rule.code_reference}
                            </p>
                          )}
                          {rule.test_hint && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                              Test hint: {rule.test_hint}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedRules.size > 0 && (
                  <div className="pt-4 border-t border-border space-y-4">
                    <button
                      className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                      onClick={handleGenerateTests}
                      disabled={generatingTests}
                    >
                      {generatingTests ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Generating Tests...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Generate Tests for {selectedRules.size} Rules
                        </>
                      )}
                    </button>
                    
                    {testGenResult && (
                      <div className={`p-4 rounded-lg border ${
                        testGenResult.status === 'error' 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-green-500/10 border-green-500/30'
                      }`}>
                        {testGenResult.status === 'error' ? (
                          <div className="flex items-center gap-2 text-red-500">
                            <XCircle className="h-5 w-5" />
                            <span>Error: {testGenResult.error}</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle className="h-5 w-5" />
                              <span className="font-medium">Tests Generated Successfully!</span>
                            </div>
                            
                            {testGenResult.test_results && (
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-green-500">
                                  Passed: {testGenResult.test_results.passed}
                                </span>
                                <span className="text-red-500">
                                  Failed: {testGenResult.test_results.failed}
                                </span>
                                <span className="text-muted-foreground">
                                  Total: {testGenResult.test_results.total}
                                </span>
                              </div>
                            )}
                            
                            {testGenResult.test_code && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                  View Generated Test Code
                                </summary>
                                <pre className="mt-2 p-3 bg-black/50 rounded text-xs overflow-x-auto max-h-96">
                                  <code>{testGenResult.test_code}</code>
                                </pre>
                              </details>
                            )}
                            
                            {testGenResult.test_results?.output && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                                  View Test Output
                                </summary>
                                <pre className="mt-2 p-3 bg-black/50 rounded text-xs overflow-x-auto max-h-64 text-green-400">
                                  {testGenResult.test_results.output}
                                </pre>
                              </details>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
