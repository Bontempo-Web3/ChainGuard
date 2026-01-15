// Database contract model
export interface ContractDB {
  id: number
  project_id: number
  contract_address: string
  network: string
  chain_id: string
  contract_name: string
  token_decimals: number | null
  deployment_id: number | null
  created_at: Date
  updated_at: Date
}

// Frontend contract interface
export interface Contract {
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

// Input for creating contract
export interface CreateContractInput {
  project_id: number
  contract_address: string
  network: string
  chain_id: string
  contract_name: string
  token_decimals?: number | null
  deployment_id?: number | null
}

// Input for updating contract
export interface UpdateContractInput {
  contract_address?: string
  network?: string
  chain_id?: string
  contract_name?: string
  token_decimals?: number | null
  deployment_id?: number | null
}
