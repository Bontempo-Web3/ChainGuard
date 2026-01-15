'use client'

import { useState } from 'react'
import { X, Activity, Loader2 } from 'lucide-react'

interface MonitorContractModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    contractName: string
    contractAddress: string
    network: string
    chainId: string
    tokenDecimals?: string
  }) => void
}

const NETWORKS = [
  { name: 'Ethereum Mainnet', chainId: '1' },
  { name: 'Sepolia', chainId: '11155111' },
  { name: 'Goerli', chainId: '5' },
  { name: 'Polygon', chainId: '137' },
  { name: 'Polygon Mumbai', chainId: '80001' },
  { name: 'BSC', chainId: '56' },
  { name: 'BSC Testnet', chainId: '97' },
  { name: 'Arbitrum One', chainId: '42161' },
  { name: 'Arbitrum Sepolia', chainId: '421614' },
  { name: 'Optimism', chainId: '10' },
  { name: 'Optimism Sepolia', chainId: '11155420' },
  { name: 'Base', chainId: '8453' },
  { name: 'Base Sepolia', chainId: '84532' },
]

export function MonitorContractModal({ isOpen, onClose, onSubmit }: MonitorContractModalProps) {
  const [contractName, setContractName] = useState('')
  const [contractAddress, setContractAddress] = useState('')
  const [network, setNetwork] = useState('sepolia')
  const [chainId, setChainId] = useState('11155111')
  const [tokenDecimals, setTokenDecimals] = useState('')
  const [errors, setErrors] = useState<{
    contractName?: string
    contractAddress?: string
    network?: string
    tokenDecimals?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedNetwork = NETWORKS.find(n => n.name === e.target.value)
    if (selectedNetwork) {
      setNetwork(selectedNetwork.name.toLowerCase().replace(/\s+/g, '-'))
      setChainId(selectedNetwork.chainId)
      setErrors(prev => ({ ...prev, network: undefined }))
    }
  }

  const validateAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: {
      contractName?: string
      contractAddress?: string
      network?: string
      tokenDecimals?: string
    } = {}

    if (!contractName.trim()) {
      newErrors.contractName = 'Contract name is required'
    }

    if (!contractAddress.trim()) {
      newErrors.contractAddress = 'Contract address is required'
    } else if (!validateAddress(contractAddress)) {
      newErrors.contractAddress = 'Invalid Ethereum address format'
    }

    if (!network) {
      newErrors.network = 'Please select a network'
    }

    if (tokenDecimals && (isNaN(Number(tokenDecimals)) || Number(tokenDecimals) < 0 || Number(tokenDecimals) > 18)) {
      newErrors.tokenDecimals = 'Token decimals must be between 0 and 18'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setIsSubmitting(true)
    onSubmit({
      contractName,
      contractAddress,
      network,
      chainId,
      tokenDecimals: tokenDecimals || undefined
    })
  }

  const handleClose = () => {
    setContractName('')
    setContractAddress('')
    setNetwork('sepolia')
    setChainId('11155111')
    setTokenDecimals('')
    setErrors({})
    setIsSubmitting(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-lg w-full max-w-md relative">
        {isSubmitting && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Adding contract to monitoring...</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Monitor Deployed Contract
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Track an already deployed smart contract
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="contractName" className="block text-sm font-medium mb-2">
              Contract Name *
            </label>
            <input
              id="contractName"
              type="text"
              value={contractName}
              onChange={(e) => {
                setContractName(e.target.value)
                setErrors(prev => ({ ...prev, contractName: undefined }))
              }}
              disabled={isSubmitting}
              placeholder="Enter contract name"
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.contractName && (
              <p className="text-red-500 text-sm mt-1">{errors.contractName}</p>
            )}
          </div>

          <div>
            <label htmlFor="contractAddress" className="block text-sm font-medium mb-2">
              Contract Address *
            </label>
            <input
              id="contractAddress"
              type="text"
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value)
                setErrors(prev => ({ ...prev, contractAddress: undefined }))
              }}
              disabled={isSubmitting}
              placeholder="0x..."
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.contractAddress && (
              <p className="text-red-500 text-sm mt-1">{errors.contractAddress}</p>
            )}
          </div>

          <div>
            <label htmlFor="network" className="block text-sm font-medium mb-2">
              Network *
            </label>
            <select
              id="network"
              onChange={handleNetworkChange}
              defaultValue="Sepolia"
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {NETWORKS.map((net) => (
                <option key={net.chainId} value={net.name}>
                  {net.name} (Chain ID: {net.chainId})
                </option>
              ))}
            </select>
            {errors.network && (
              <p className="text-red-500 text-sm mt-1">{errors.network}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Chain ID: {chainId}
            </p>
          </div>

          <div>
            <label htmlFor="tokenDecimals" className="block text-sm font-medium mb-2">
              Token Decimals (Optional)
            </label>
            <input
              id="tokenDecimals"
              type="number"
              min="0"
              max="18"
              value={tokenDecimals}
              onChange={(e) => {
                setTokenDecimals(e.target.value)
                setErrors(prev => ({ ...prev, tokenDecimals: undefined }))
              }}
              disabled={isSubmitting}
              placeholder="18"
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.tokenDecimals && (
              <p className="text-red-500 text-sm mt-1">{errors.tokenDecimals}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              For ERC20 tokens (typically 18, but can vary)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
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
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Contract
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}