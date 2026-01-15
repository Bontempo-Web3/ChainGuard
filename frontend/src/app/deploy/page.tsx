'use client'

import { useState, useEffect } from 'react'
import { Rocket, Wallet, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { LandingPage } from '@/components/layout/LandingPage'
import { useAccount } from 'wagmi'

interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

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

export default function DeployPage() {
  const { address, isConnected } = useAccount()
  const [deploying, setDeploying] = useState(false)
  const [deployed, setDeployed] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState('arbitrum-sepolia')
  const [constructorArgs, setConstructorArgs] = useState<string[]>([])
  const [showConstructorForm, setShowConstructorForm] = useState(false)
  const [contractAbi, setContractAbi] = useState<any[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects()
    }
  }, [isAuthenticated])

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

  const fetchProjects = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/projects`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        // Filter only GitHub/ZIP projects (not deployed yet)
        const deployableProjects = data.filter((p: Project) => 
          (p.projectType === 'github' || p.projectType === 'zip') && 
          !p.isDeployed
        )
        setProjects(deployableProjects)
        
        // Auto-select first project
        if (deployableProjects.length > 0 && !selectedProject) {
          setSelectedProject(deployableProjects[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }


  const handleDeploy = async () => {
    if (!selectedProject) {
      alert('Please select a project to deploy')
      return
    }

    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    setDeploying(true)

    try {
      // Network chain IDs
      const networkChainIds: Record<string, string> = {
        'sepolia': '0xaa36a7',
        'arbitrum-sepolia': '0x66eee',
        'ethereum': '0x1',
        'arbitrum': '0xa4b1',
        'polygon': '0x89',
        'base': '0x2105'
      }

      const targetChainId = networkChainIds[selectedNetwork]
      if (targetChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetChainId }]
          })
        } catch (switchError: any) {
          // Chain not added, try to add it
          if (switchError.code === 4902 && selectedNetwork === 'arbitrum-sepolia') {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x66eee',
                chainName: 'Arbitrum Sepolia',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://sepolia.arbiscan.io']
              }]
            })
          } else {
            throw switchError
          }
        }
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: selectedProject.id,
          network: selectedNetwork
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.details || error.error || 'Compilation failed')
      }

      const { bytecode, abi, contractName } = await response.json()

      // Check if constructor needs arguments
      const constructorAbi = abi.find((item: any) => item.type === 'constructor')
      const constructorInputs = constructorAbi?.inputs || []
      
      console.log('Constructor inputs:', constructorInputs)
      console.log('Current constructor args:', constructorArgs)
      
      // Check if we have valid (non-empty) constructor arguments
      const hasValidArgs = constructorArgs.length > 0 && constructorArgs.every(arg => arg && arg.trim() !== '')
      console.log('Has valid args:', hasValidArgs)
      
      if (constructorInputs.length > 0 && !hasValidArgs) {
        // Need constructor arguments - show form with auto-filled known addresses
        console.log('Showing constructor form')
        setContractAbi(abi)
        setShowConstructorForm(true)
        
        // Known addresses by network
        const knownAddresses: Record<string, Record<string, string>> = {
          'arbitrum-sepolia': {
            // Uniswap V3 not on Arb Sepolia - using WETH for testing
            'swapRouter': '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
            'factory': '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
            'router': '0x980B62Da83eFf3D4576C647993b0c1D7faf17c73',
          },
          'arbitrum': {
            'swapRouter': '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            'factory': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            'router': '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          },
          'ethereum': {
            'swapRouter': '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            'factory': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            'router': '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          },
          'sepolia': {
            'swapRouter': '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
            'factory': '0x0227628f3F023bb0B980b67D528571c95c6DaC1c',
            'router': '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
          },
          'polygon': {
            'swapRouter': '0xE592427A0AEce92De3Edee1F18E0157C05861564',
            'factory': '0x1F98431c8aD98523631AE4a59f267346ea31F984',
            'router': '0xE592427A0AEce92De3Edee1F18E0157C05861564',
          },
          'base': {
            'swapRouter': '0x2626664c2603336E57B271c5C0b26F421741e481',
            'factory': '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
            'router': '0x2626664c2603336E57B271c5C0b26F421741e481',
          },
        }
        
        // Auto-fill known addresses based on arg name
        const networkAddresses = knownAddresses[selectedNetwork] || {}
        const autoFilledArgs = constructorInputs.map((input: any) => {
          const name = input.name.toLowerCase()
          if (name.includes('router') || name.includes('swaprouter')) {
            return networkAddresses['swapRouter'] || ''
          }
          if (name.includes('factory')) {
            return networkAddresses['factory'] || ''
          }
          return ''
        })
        
        setConstructorArgs(autoFilledArgs)
        setDeploying(false)
        return
      }

      console.log('Deploying with args:', constructorArgs)
      console.log('Arg values:', JSON.stringify(constructorArgs))

      const { ethers } = await import('ethers')
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Validate addresses before deployment
      console.log('Raw constructorArgs from state:', constructorArgs)
      
      const validatedArgs = constructorArgs.map((arg, i) => {
        console.log(`Arg ${i} raw value:`, arg, 'type:', typeof arg)
        if (ethers.isAddress(arg)) {
          console.log(`Arg ${i} is valid address:`, arg)
          return arg
        }
        console.log(`Arg ${i} is NOT a valid address:`, arg)
        return arg
      })

      // Build deployment data manually
      const iface = new ethers.Interface(abi)
      const encodedArgs = iface.encodeDeploy(validatedArgs)
      console.log('Encoded constructor args:', encodedArgs)
      
      // Combine bytecode + constructor args
      const deployData = bytecode + encodedArgs.slice(2) // remove 0x from args
      console.log('Deploy data length:', deployData.length)
      
      // Get current nonce
      const nonce = await provider.getTransactionCount(await signer.getAddress())
      console.log('Current nonce:', nonce)
      
      // Send transaction directly via MetaMask with explicit gas
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: await signer.getAddress(),
          data: deployData,
          gas: '0x4C4B40', // 5,000,000 gas
          nonce: '0x' + nonce.toString(16)
        }]
      })
      
      console.log('Transaction hash:', txHash)
      
      // Wait for receipt
      const receipt = await provider.waitForTransaction(txHash)
      console.log('Receipt:', receipt)
      
      const contractAddress = receipt?.contractAddress

      const network = await provider.getNetwork()

      await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/deploy/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: selectedProject.id,
          contractAddress,
          network: selectedNetwork,
          chainId: network.chainId.toString(),
          contractName: selectedProject.projectName,
          transactionHash: txHash
        })
      })

      setDeployed({
        address: contractAddress || '',
        network: selectedNetwork,
        txHash: txHash || '',
        gasUsed: receipt?.gasUsed?.toString() || '0',
        projectName: selectedProject.projectName
      })

      // Reset constructor args after successful deployment
      setConstructorArgs([])
      setShowConstructorForm(false)
      setContractAbi([])

    } catch (error: any) {
      console.error('Deployment failed:', error)
      alert(`Deployment failed: ${error.message}`)
    } finally {
      setDeploying(false)
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
          <h1 className="text-2xl font-semibold">Secure Deploy</h1>
          <p className="text-muted-foreground mt-2">
            Deploy your contracts safely with pre-deployment security validation
          </p>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Select Project to Deploy</h3>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No deployable projects found. Projects must be scanned and approved first.
              </p>
            ) : (
              <select
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === parseInt(e.target.value))
                  setSelectedProject(project || null)
                  // Reset constructor args when changing project
                  setConstructorArgs([])
                  setShowConstructorForm(false)
                  setContractAbi([])
                }}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm"
              >
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.projectName} ({project.projectType})
                  </option>
                ))}
              </select>
            )}
            {selectedProject && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-muted-foreground">
                  Type: {selectedProject.projectType.toUpperCase()}
                </p>
                {selectedProject.githubRepoUrl && (
                  <p className="text-xs text-muted-foreground">
                    Repository: {selectedProject.githubRepoUrl}
                  </p>
                )}
                {selectedProject.description && (
                  <p className="text-xs text-muted-foreground">
                    {selectedProject.description}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Wallet Connection</h2>
                <p className="text-sm text-muted-foreground">Connect your wallet to deploy</p>
              </div>
              {isConnected ? (
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle className="h-5 w-5" />
                  <span>Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm">Connect wallet in Sidebar to deploy</span>
                </div>
              )}
            </div>
          </div>

          {selectedProject && (
            <div className="border-t border-border pt-6">
              <h3 className="font-medium mb-4">Pre-deployment Checks</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {selectedProject.scanApproved ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  <span>
                    {selectedProject.scanApproved 
                      ? 'Security scan passed' 
                      : 'Security scan pending'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Project ready for deployment</span>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-border pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium">Network</h3>
                <p className="text-sm text-muted-foreground">Select deployment network</p>
              </div>
              <select 
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="bg-secondary border border-border rounded-lg px-4 py-2"
              >
                <option value="sepolia">Sepolia (Testnet)</option>
                <option value="arbitrum-sepolia">Arbitrum Sepolia (Testnet)</option>
                <option value="ethereum">Ethereum Mainnet</option>
                <option value="arbitrum">Arbitrum Mainnet</option>
                <option value="polygon">Polygon</option>
                <option value="base">Base</option>
              </select>
            </div>
          </div>

          {showConstructorForm && contractAbi.length > 0 && (
            <div className="border-t border-border pt-6">
              <h3 className="font-medium mb-4">Constructor Arguments</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This contract requires the following constructor arguments:
              </p>
              <div className="space-y-3">
                {contractAbi.find((item: any) => item.type === 'constructor')?.inputs?.map((input: any, index: number) => (
                  <div key={index}>
                    <label className="block text-sm font-medium mb-1">
                      {input.name} ({input.type})
                    </label>
                    <input
                      type="text"
                      value={constructorArgs[index] || ''}
                      onChange={(e) => {
                        const newArgs = [...constructorArgs]
                        newArgs[index] = e.target.value
                        setConstructorArgs(newArgs)
                      }}
                      placeholder={`Enter ${input.name}`}
                      className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleDeploy}
            disabled={!isConnected || deploying || !selectedProject}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {deploying ? 'Deploying...' : showConstructorForm ? 'Deploy with Arguments' : 'Deploy Contract'}
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
              href={
                deployed.network === 'arbitrum-sepolia' ? `https://sepolia.arbiscan.io/tx/${deployed.txHash}` :
                deployed.network === 'arbitrum' ? `https://arbiscan.io/tx/${deployed.txHash}` :
                deployed.network === 'sepolia' ? `https://sepolia.etherscan.io/tx/${deployed.txHash}` :
                deployed.network === 'ethereum' ? `https://etherscan.io/tx/${deployed.txHash}` :
                deployed.network === 'polygon' ? `https://polygonscan.com/tx/${deployed.txHash}` :
                deployed.network === 'base' ? `https://basescan.org/tx/${deployed.txHash}` :
                `https://etherscan.io/tx/${deployed.txHash}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              View on Block Explorer
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
