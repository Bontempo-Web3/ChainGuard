import { Router } from 'express';
import { githubConfig } from '../config/github';
import { GitHubService } from '../services/github.service';
import { UserRepository } from '../repositories/UserRepository';
import { transformUserForFrontend } from '../lib/userTransform';

// Extend session type
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    githubToken?: string;
  }
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  error?: string;
  error_description?: string;
}

const router = Router();

router.get('/github', (req, res) => {
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${githubConfig.clientId}&redirect_uri=${githubConfig.callbackURL}&scope=repo,user,workflow`;
  res.redirect(redirectUri);
});

router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=no_code`);
  }

  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: githubConfig.clientId,
        client_secret: githubConfig.clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as GitHubTokenResponse;

    if (tokenData.error) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=${tokenData.error}`);
    }

    const githubService = new GitHubService(tokenData.access_token);
    const githubUser = await githubService.getUser();

    // Save or update user in database
    const userDB = await UserRepository.upsert({
      github_id: githubUser.id.toString(),
      github_username: githubUser.login,
      email: githubUser.email || '',
      avatar_url: githubUser.avatar_url,
      access_token: tokenData.access_token
    });

    // Transform for frontend and store in session
    const user = transformUserForFrontend(userDB);

    // Store user ID in session instead of full user object
    req.session.userId = userDB.id;
    req.session.githubToken = tokenData.access_token;

    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

router.get('/user', async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Fetch user from database
    const userDB = await UserRepository.findById(req.session.userId);

    if (!userDB) {
      // User was deleted from database
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }

    // Transform and send to frontend
    const user = transformUserForFrontend(userDB);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

export default router;