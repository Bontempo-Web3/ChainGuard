import pool from '../lib/db'
import { UserDB, CreateUserInput, UpdateUserInput } from '../models/User'

export class UserRepository {
  // Create a new user
  static async create(userData: CreateUserInput): Promise<UserDB> {
    const query = `
      INSERT INTO users (github_id, github_username, email, avatar_url, access_token, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `
    
    const values = [
      userData.github_id,
      userData.github_username,
      userData.email,
      userData.avatar_url,
      userData.access_token
    ]
    
    const result = await pool.query(query, values)
    return result.rows[0]
  }

  // Find user by ID
  static async findById(id: number): Promise<UserDB | null> {
    const query = 'SELECT * FROM users WHERE id = $1'
    const result = await pool.query(query, [id])
    return result.rows[0] || null
  }

  // Find user by GitHub ID
  static async findByGithubId(githubId: string): Promise<UserDB | null> {
    const query = 'SELECT * FROM users WHERE github_id = $1'
    const result = await pool.query(query, [githubId])
    return result.rows[0] || null
  }

  // Find user by email
  static async findByEmail(email: string): Promise<UserDB | null> {
    const query = 'SELECT * FROM users WHERE email = $1'
    const result = await pool.query(query, [email])
    return result.rows[0] || null
  }

  // Update user by ID
  static async update(id: number, userData: UpdateUserInput): Promise<UserDB | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (userData.github_username !== undefined) {
      fields.push(`github_username = $${paramCount}`)
      values.push(userData.github_username)
      paramCount++
    }

    if (userData.email !== undefined) {
      fields.push(`email = $${paramCount}`)
      values.push(userData.email)
      paramCount++
    }

    if (userData.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount}`)
      values.push(userData.avatar_url)
      paramCount++
    }

    if (userData.access_token !== undefined) {
      fields.push(`access_token = $${paramCount}`)
      values.push(userData.access_token)
      paramCount++
    }

    if (fields.length === 0) {
      return this.findById(id)
    }

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  // Update user by GitHub ID
  static async updateByGithubId(githubId: string, userData: UpdateUserInput): Promise<UserDB | null> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (userData.github_username !== undefined) {
      fields.push(`github_username = $${paramCount}`)
      values.push(userData.github_username)
      paramCount++
    }

    if (userData.email !== undefined) {
      fields.push(`email = $${paramCount}`)
      values.push(userData.email)
      paramCount++
    }

    if (userData.avatar_url !== undefined) {
      fields.push(`avatar_url = $${paramCount}`)
      values.push(userData.avatar_url)
      paramCount++
    }

    if (userData.access_token !== undefined) {
      fields.push(`access_token = $${paramCount}`)
      values.push(userData.access_token)
      paramCount++
    }

    if (fields.length === 0) {
      return this.findByGithubId(githubId)
    }

    fields.push(`updated_at = NOW()`)
    values.push(githubId)

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE github_id = $${paramCount}
      RETURNING *
    `

    const result = await pool.query(query, values)
    return result.rows[0] || null
  }

  // Upsert user (update if exists, create if not)
  static async upsert(userData: CreateUserInput): Promise<UserDB> {
    const existing = await this.findByGithubId(userData.github_id)
    
    if (existing) {
      return await this.updateByGithubId(userData.github_id, {
        github_username: userData.github_username,
        email: userData.email,
        avatar_url: userData.avatar_url,
        access_token: userData.access_token
      }) as UserDB
    }
    
    return await this.create(userData)
  }

  // Delete user by ID
  static async delete(id: number): Promise<boolean> {
    const query = 'DELETE FROM users WHERE id = $1 RETURNING id'
    const result = await pool.query(query, [id])
    return result.rowCount ? result.rowCount > 0 : false
  }

  // Delete user by GitHub ID
  static async deleteByGithubId(githubId: string): Promise<boolean> {
    const query = 'DELETE FROM users WHERE github_id = $1 RETURNING id'
    const result = await pool.query(query, [githubId])
    return result.rowCount ? result.rowCount > 0 : false
  }

  // List all users with pagination
  static async list(limit: number = 10, offset: number = 0): Promise<UserDB[]> {
    const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2'
    const result = await pool.query(query, [limit, offset])
    return result.rows
  }

  // Count total users
  static async count(): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM users'
    const result = await pool.query(query)
    return parseInt(result.rows[0].count)
  }
}
