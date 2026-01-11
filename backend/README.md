# ChainGuard Backend

Node.js + Express backend for ChainGuard GitHub OAuth integration.

## Features

- GitHub OAuth authentication
- Repository listing and management
- Automatic GitHub Actions setup for ChainGuard security scans
- Session-based authentication

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure GitHub OAuth App:
   - Go to https://github.com/settings/developers
   - Create a new OAuth App
   - Set Authorization callback URL to: `http://localhost:3002/api/auth/callback`
   - Copy Client ID and Client Secret to `.env`

4. Run development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `GET /api/auth/github` - Initiate GitHub OAuth flow
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/user` - Get current user info
- `POST /api/auth/logout` - Logout user

### Repositories
- `GET /api/repos` - List user repositories
- `GET /api/repos/:owner/:repo` - Get repository details
- `POST /api/repos/:owner/:repo/setup-actions` - Add ChainGuard GitHub Action

## Environment Variables

```
PORT=3002
FRONTEND_URL=http://localhost:3001
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:3002/api/auth/callback
SESSION_SECRET=your_random_session_secret
```
