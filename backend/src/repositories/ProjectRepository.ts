import pool from '../lib/db'
import { ProjectDB, CreateProjectInput, UpdateProjectInput, ProjectType } from '../models/Project'

export class ProjectRepository {
  // Create a new project
  static async create(projectData: CreateProjectInput): Promise<ProjectDB> {
    const query = `
      INSERT INTO projects (
        user_id, project_name, description, project_type,
        github_repo_url, github_repo_path, zip_file_path,
        scan_approved, is_deployed, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `
    
    const values = [
      projectData.user_id,
      projectData.project_name,
      projectData.description || null,
      projectData.project_type,
      projectData.github_repo_url || null,
      projectData.github_repo_path || null,
      projectData.zip_file_path || null,
      projectData.scan_approved || false,
      projectData.is_deployed || false
    ]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  // Find project by ID
  static async findById(id: number): Promise<ProjectDB | null> {
    const query = 'SELECT * FROM projects WHERE id = $1'
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  // Find all projects for a user
  static async findByUserId(userId: number): Promise<ProjectDB[]> {
    const query = 'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC'
    const result = await pool.query(query, [userId])
    return result.rows
  }

  // Find projects by type
  static async findByType(userId: number, projectType: ProjectType): Promise<ProjectDB[]> {
    const query = 'SELECT * FROM projects WHERE user_id = $1 AND project_type = $2 ORDER BY created_at DESC'
    const result = await pool.query(query, [userId, projectType])
    return result.rows
  }

  // Find deployed projects
  static async findDeployed(userId: number): Promise<ProjectDB[]> {
    const query = 'SELECT * FROM projects WHERE user_id = $1 AND is_deployed = true ORDER BY created_at DESC'
    const result = await pool.query(query, [userId])
    return result.rows
  }

  // Find scan-approved projects
  static async findScanApproved(userId: number): Promise<ProjectDB[]> {
    const query = 'SELECT * FROM projects WHERE user_id = $1 AND scan_approved = true ORDER BY created_at DESC'
    const result = await pool.query(query, [userId])
    return result.rows
  }

  // Update project by ID
  static async update(id: number, projectData: UpdateProjectInput): Promise<ProjectDB | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (projectData.project_name !== undefined) {
      fields.push(`project_name = $${paramCount}`)
      values.push(projectData.project_name)
      paramCount++
    }

    if (projectData.description !== undefined) {
      fields.push(`description = $${paramCount}`)
      values.push(projectData.description)
      paramCount++
    }

    if (projectData.github_repo_url !== undefined) {
      fields.push(`github_repo_url = $${paramCount}`)
      values.push(projectData.github_repo_url)
      paramCount++
    }

    if (projectData.github_repo_path !== undefined) {
      fields.push(`github_repo_path = $${paramCount}`)
      values.push(projectData.github_repo_path)
      paramCount++
    }

    if (projectData.zip_file_path !== undefined) {
      fields.push(`zip_file_path = $${paramCount}`)
      values.push(projectData.zip_file_path)
      paramCount++
    }

    if (projectData.scan_approved !== undefined) {
      fields.push(`scan_approved = $${paramCount}`)
      values.push(projectData.scan_approved)
      paramCount++
    }

    if (projectData.is_deployed !== undefined) {
      fields.push(`is_deployed = $${paramCount}`)
      values.push(projectData.is_deployed)
      paramCount++
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE projects 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  // Delete project by ID
  static async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING id'
    const result = await pool.query(query, [id])
    return result.rowCount ? result.rowCount > 0 : false
  }

  // Delete all projects for a user
  static async deleteByUserId(userId: number): Promise<number> {
    const query = 'DELETE FROM projects WHERE user_id = $1 RETURNING id'
    const result = await pool.query(query, [userId])
    return result.rowCount || 0
  }

  // List projects with pagination
  static async list(userId: number, limit: number = 10, offset: number = 0): Promise<ProjectDB[]> {
    const query = `
      SELECT * FROM projects 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `
    const result = await pool.query(query, [userId, limit, offset])
    return result.rows
  }

  // Count total projects for a user
  static async count(userId: number): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM projects WHERE user_id = $1'
    const result = await pool.query(query, [userId])
    return parseInt(result.rows[0].count)
  }

  // Count projects by type
  static async countByType(userId: number, projectType: ProjectType): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM projects WHERE user_id = $1 AND project_type = $2'
    const result = await pool.query(query, [userId, projectType])
    return parseInt(result.rows[0].count)
  }

  // Search projects by name
  static async searchByName(userId: number, searchTerm: string): Promise<ProjectDB[]> {
    const query = `
      SELECT * FROM projects 
      WHERE user_id = $1 AND project_name ILIKE $2 
      ORDER BY created_at DESC
    `
    const result = await pool.query(query, [userId, `%${searchTerm}%`])
    return result.rows
  }
}
