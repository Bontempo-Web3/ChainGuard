import { Router } from 'express';
import { githubConfig } from '../config/github';
import { GitHubService } from '../services/github.service';

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

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return res.redirect(`${process.env.FRONTEND_URL}?error=${tokenData.error}`);
    }

    const githubService = new GitHubService(tokenData.access_token);
    const user = await githubService.getUser();

    req.session.githubToken = tokenData.access_token;
    req.session.user = user;

    res.redirect(`${process.env.FRONTEND_URL}/`);
  } catch (error: any) {
    console.error('GitHub OAuth error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

router.get('/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.session.user);
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
