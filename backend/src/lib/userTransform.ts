import pool from '../lib/db'
import { UserDB, User, CreateUserInput, UpdateUserInput } from '../models/User'
import crypto from 'crypto'

// Encryption utilities
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here'
const ALGORITHM = 'aes-256-cbc'

function encryptToken(token: string): string {
  // Implement encryption logic here
  // For now, returning as-is, but you should use crypto module
  return token
}

function decryptToken(encryptedToken: string): string {
  // Implement decryption logic
  return encryptedToken
}

// Transform database user to frontend user interface
export function transformUserForFrontend(userDB: UserDB): User {
  return {
    id: userDB.id,
    login: userDB.github_username,
    name: userDB.github_username,
    avatar_url: userDB.avatar_url,
    email: userDB.email
  }
}
