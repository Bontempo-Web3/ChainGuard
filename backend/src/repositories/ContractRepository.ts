import pool from '../lib/db'
import { ContractDB, CreateContractInput, UpdateContractInput } from '../models/Contract'

export class ContractRepository {
  // Create a new contract
  static async create(contractData: CreateContractInput): Promise<ContractDB> {
    const query = `
      INSERT INTO contracts (
        project_id, contract_address, network, chain_id,
        contract_name, token_decimals, deployment_id,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `
    
    const values = [
      contractData.project_id,
      contractData.contract_address,
      contractData.network,
      contractData.chain_id,
      contractData.contract_name,
      contractData.token_decimals || null,
      contractData.deployment_id || null
    ]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  // Find contract by ID
  static async findById(id: number): Promise<ContractDB | null> {
    const query = 'SELECT * FROM contracts WHERE id = $1'
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  // Find contract by address and network
  static async findByAddressAndNetwork(address: string, network: string): Promise<ContractDB | null> {
    const query = 'SELECT * FROM contracts WHERE contract_address = $1 AND network = $2'
    const result = await pool.query(query, [address, network])
    return result.rows[0] || null
  }

  // Find all contracts for a project
  static async findByProjectId(projectId: number): Promise<ContractDB[]> {
    const query = 'SELECT * FROM contracts WHERE project_id = $1 ORDER BY created_at DESC'
    const result = await pool.query(query, [projectId])
    return result.rows
  }

  // Find contracts by network
  static async findByNetwork(network: string): Promise<ContractDB[]> {
    const query = 'SELECT * FROM contracts WHERE network = $1 ORDER BY created_at DESC'
    const result = await pool.query(query, [network])
    return result.rows
  }

  // Find contracts by chain ID
  static async findByChainId(chainId: string): Promise<ContractDB[]> {
    const query = 'SELECT * FROM contracts WHERE chain_id = $1 ORDER BY created_at DESC'
    const result = await pool.query(query, [chainId])
    return result.rows
  }

  // Find contract by deployment ID
  static async findByDeploymentId(deploymentId: number): Promise<ContractDB | null> {
    const query = 'SELECT * FROM contracts WHERE deployment_id = $1'
    const result = await pool.query(query, [deploymentId])
    return result.rows[0] || null
  }

  // Update contract by ID
  static async update(id: number, contractData: UpdateContractInput): Promise<ContractDB | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (contractData.contract_address !== undefined) {
      fields.push(`contract_address = $${paramCount}`)
      values.push(contractData.contract_address)
      paramCount++
    }

    if (contractData.network !== undefined) {
      fields.push(`network = $${paramCount}`)
      values.push(contractData.network)
      paramCount++
    }

    if (contractData.chain_id !== undefined) {
      fields.push(`chain_id = $${paramCount}`)
      values.push(contractData.chain_id)
      paramCount++
    }

    if (contractData.contract_name !== undefined) {
      fields.push(`contract_name = $${paramCount}`)
      values.push(contractData.contract_name)
      paramCount++
    }

    if (contractData.token_decimals !== undefined) {
      fields.push(`token_decimals = $${paramCount}`)
      values.push(contractData.token_decimals)
      paramCount++
    }

    if (contractData.deployment_id !== undefined) {
      fields.push(`deployment_id = $${paramCount}`)
      values.push(contractData.deployment_id)
      paramCount++
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE contracts 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  // Delete contract by ID
  static async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM contracts WHERE id = $1 RETURNING id'
    const result = await pool.query(query, [id])
    return result.rowCount ? result.rowCount > 0 : false
  }

  // Delete all contracts for a project
  static async deleteByProjectId(projectId: number): Promise<number> {
    const query = 'DELETE FROM contracts WHERE project_id = $1 RETURNING id'
    const result = await pool.query(query, [projectId])
    return result.rowCount || 0
  }

  // List contracts with pagination
  static async list(limit: number = 10, offset: number = 0): Promise<ContractDB[]> {
    const query = `
      SELECT * FROM contracts 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `
    const result = await pool.query(query, [limit, offset])
    return result.rows
  }

  // Count total contracts
  static async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM contracts'
    const result = await pool.query(query)
    return parseInt(result.rows[0].count)
  }

  // Count contracts by project
  static async countByProjectId(projectId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM contracts WHERE project_id = $1'
    const result = await pool.query(query, [projectId])
    return parseInt(result.rows[0].count)
  }

  // Search contracts by name
  static async searchByName(searchTerm: string): Promise<ContractDB[]> {
    const query = `
      SELECT * FROM contracts 
      WHERE contract_name ILIKE $1 
      ORDER BY created_at DESC
    `
    const result = await pool.query(query, [`%${searchTerm}%`])
    return result.rows
  }

  // Get contracts with project information (JOIN query)
  static async findWithProjectInfo(contractId: number): Promise<any> {
    const query = `
      SELECT 
        c.*,
        p.project_name,
        p.project_type,
        p.user_id
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      WHERE c.id = $1
    `
    const result = await pool.query(query, [contractId])
    return result.rows[0] || null
  }

  // Get all contracts with their project information
  static async listWithProjectInfo(limit: number = 10, offset: number = 0): Promise<any[]> {
    const query = `
      SELECT 
        c.*,
        p.project_name,
        p.project_type,
        p.user_id
      FROM contracts c
      JOIN projects p ON c.project_id = p.id
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
    `
    const result = await pool.query(query, [limit, offset])
    return result.rows
  }
}
