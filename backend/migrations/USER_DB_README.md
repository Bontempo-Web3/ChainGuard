# User Database Integration

This module provides PostgreSQL database integration for the Users table with complete CRUD operations.

## Structure

```
backend/
├── src/
│   ├── lib/
│   │   ├── db.ts                  # PostgreSQL connection pool
│   │   └── userTransform.ts       # Transform DB model to frontend interface
│   ├── models/
│   │   └── User.ts                # User interfaces and types
│   ├── repositories/
│   │   └── UserRepository.ts      # CRUD operations
│   └── examples/
│       └── userExamples.ts        # Usage examples
└── migrations/
    └── 001_create_users_table.sql # Database migration
```

## Environment Variables

Add these to your `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chainguard
DB_USER=postgres
DB_PASSWORD=your_password
ENCRYPTION_KEY=your-32-character-secret-key-here
```

## Installation

Install the PostgreSQL driver:

```bash
npm install pg
npm install --save-dev @types/pg
```

## Database Setup

Run the migration to create the users table:

```bash
psql -U postgres -d chainguard -f migrations/001_create_users_table.sql
```

## Usage

### Import the Repository

```typescript
import { UserRepository } from './repositories/UserRepository'
import { transformUserForFrontend } from './lib/userTransform'
```

### Create/Update User (Upsert)

```typescript
const userDB = await UserRepository.upsert({
  github_id: '12345',
  github_username: 'johndoe',
  email: 'john@example.com',
  avatar_url: 'https://github.com/avatar.jpg',
  access_token: 'encrypted_token'
})

const user = transformUserForFrontend(userDB)
```

### Find User by ID

```typescript
const userDB = await UserRepository.findById(1)
if (userDB) {
  const user = transformUserForFrontend(userDB)
}
```

### Find User by GitHub ID

```typescript
const userDB = await UserRepository.findByGithubId('12345')
```

### Update User

```typescript
const userDB = await UserRepository.update(1, {
  email: 'newemail@example.com',
  avatar_url: 'https://new-avatar.jpg'
})
```

### Delete User

```typescript
const deleted = await UserRepository.delete(1)
```

### List Users with Pagination

```typescript
const users = await UserRepository.list(10, 0)
const totalUsers = await UserRepository.count()
```

## Available Methods

### UserRepository

- `create(userData: CreateUserInput): Promise<UserDB>`
- `findById(id: number): Promise<UserDB | null>`
- `findByGithubId(githubId: string): Promise<UserDB | null>`
- `findByEmail(email: string): Promise<UserDB | null>`
- `update(id: number, userData: UpdateUserInput): Promise<UserDB | null>`
- `updateByGithubId(githubId: string, userData: UpdateUserInput): Promise<UserDB | null>`
- `upsert(userData: CreateUserInput): Promise<UserDB>`
- `delete(id: number): Promise<boolean>`
- `deleteByGithubId(githubId: string): Promise<boolean>`
- `list(limit: number, offset: number): Promise<UserDB[]>`
- `count(): Promise<number>`

## Data Transformation

The database stores users with these fields:
- `github_username`
- `github_id`
- `access_token`

The frontend expects this interface:
```typescript
interface User {
  id: number
  login: string        // Mapped from github_username
  name: string         // Mapped from github_username
  avatar_url: string
  email: string
}
```

Use `transformUserForFrontend()` to convert database records to the frontend interface.

## Security Notes

1. The `access_token` field should be encrypted before storing
2. Never return `access_token` to the frontend
3. Use environment variables for database credentials
4. Implement proper token encryption in `userTransform.ts`

## Next Steps

1. Implement token encryption in `userTransform.ts`
2. Add error handling middleware
3. Create similar repositories for Projects, Scans, Deployments, and Contracts tables
