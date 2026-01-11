import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { GitHubService } from '../services/github.service';
import { ActionsService } from '../services/actions.service';

const router = Router();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const githubService = new GitHubService(req.session.githubToken!);
    const repos = await githubService.getRepositories();
    res.json(repos);
  } catch (error: any) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

router.get('/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const githubService = new GitHubService(req.session.githubToken!);
    const repository = await githubService.getRepository(owner, repo);
    res.json(repository);
  } catch (error: any) {
    console.error('Error fetching repository:', error);
    res.status(500).json({ error: 'Failed to fetch repository' });
  }
});

router.post('/:owner/:repo/setup-actions', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { contractsPath } = req.body;

    console.log(`Setting up GitHub Action for ${owner}/${repo}`);
    console.log(`Contracts path: ${contractsPath || './contracts'}`);

    const actionsService = new ActionsService(req.session.githubToken!);
    const result = await actionsService.setupChainGuardAction(
      owner,
      repo,
      contractsPath || './contracts'
    );

    console.log('GitHub Action setup successful');
    res.json(result);
  } catch (error: any) {
    console.error('Error setting up GitHub Actions:', error);
    console.error('Error details:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Failed to setup GitHub Actions' });
  }
});

export default router;
