// Database user model
export interface UserDB {
  id: number
  github_id: string
  github_username: string
  email: string
  avatar_url: string
  access_token: string
  created_at: Date
  updated_at: Date
}

// Frontend user interface
export interface User {
  id: number
  login: string
  name: string
  avatar_url: string
  email: string
}

// Input for creating/updating user
export interface CreateUserInput {
  github_id: string
  github_username: string
  email: string
  avatar_url: string
  access_token: string
}

export interface UpdateUserInput {
  github_username?: string
  email?: string
  avatar_url?: string
  access_token?: string
}
