import { ContractDB, Contract } from '../models/Contract'

// Transform database contract to frontend contract interface
export function transformContractForFrontend(contractDB: ContractDB): Contract {
  return {
    id: contractDB.id,
    projectId: contractDB.project_id,
    contractAddress: contractDB.contract_address,
    network: contractDB.network,
    chainId: contractDB.chain_id,
    contractName: contractDB.contract_name,
    tokenDecimals: contractDB.token_decimals,
    deploymentId: contractDB.deployment_id,
    createdAt: contractDB.created_at,
    updatedAt: contractDB.updated_at
  }
}

// Transform multiple contracts
export function transformContractsForFrontend(contractsDB: ContractDB[]): Contract[] {
  return contractsDB.map(transformContractForFrontend)
}
