'use client'

import { useState, useEffect } from 'react'
import { Rocket, Wallet, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { LandingPage } from '@/components/layout/LandingPage'

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

export default function DeployPage() {
  const [connected, setConnected] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState<any>(null)
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

  const handleConnect = () => {
    // TODO: Implement Wagmi wallet connection
    setConnected(true)
  }

  const handleDeploy = async () => {
    setDeploying(true)
    // TODO: Implement deployment logic with ethers.js
    setTimeout(() => {
      setDeployed({
        address: '0x1234...5678',
        network: 'Sepolia',
        txHash: '0xabcd...efgh',
        gasUsed: '1,234,567'
      })
      setDeploying(false)
    }, 3000)
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
          <h1 className="text-2xl font-semibold">Secure Deploy</h1>
          <p className="text-muted-foreground mt-2">
            Deploy your contracts safely with pre-deployment security validation
          </p>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Wallet Connection</h2>
              <p className="text-sm text-muted-foreground">Connect your wallet to deploy</p>
            </div>
            {connected ? (
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span>Connected</span>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <h3 className="font-medium mb-4">Pre-deployment Checks</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Security scan passed (0 critical, 0 high)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Contract compiled successfully</span>
              </div>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <span>3 medium severity warnings (review recommended)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Network</h3>
                <p className="text-sm text-muted-foreground">Select deployment network</p>
              </div>
              <select className="bg-secondary border border-border rounded-lg px-4 py-2">
                <option>Sepolia (Testnet)</option>
                <option>Ethereum Mainnet</option>
                <option>Polygon</option>
                <option>Arbitrum</option>
                <option>Base</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleDeploy}
            disabled={!connected || deploying}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {deploying ? 'Deploying...' : 'Deploy Contract'}
          </button>
        </div>

        {deployed && (
          <div className="border border-green-500/20 rounded-lg p-6 bg-green-500/10 space-y-4">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-6 w-6" />
              <h2 className="text-xl font-semibold">Deployment Successful</h2>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contract Address:</span>
                <span className="font-mono">{deployed.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <span>{deployed.network}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gas Used:</span>
                <span>{deployed.gasUsed}</span>
              </div>
            </div>

            <a
              href={`https://sepolia.etherscan.io/tx/${deployed.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              View on Etherscan
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
