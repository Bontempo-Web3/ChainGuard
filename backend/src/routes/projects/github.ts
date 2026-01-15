import { Router, Request, Response } from 'express';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { UserRepository } from '../../repositories/UserRepository';
import { transformProjectForFrontend } from '../../lib/projectTransform';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const router = Router();
const execAsync = promisify(exec);

// POST /api/projects/github - Connect GitHub repository
router.post('/github', async (req: Request, res: Response) => {
  try {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get form data
    const { repoUrl, repoName, repoPath, description } = req.body;

    // Validation
    if (!repoUrl || !repoName) {
      return res.status(400).json({ error: 'Repository URL and name are required' });
    }

    if (!repoPath || !repoPath.trim()) {
      return res.status(400).json({ error: 'Contracts path is required' });
    }

    // Get user to retrieve GitHub access token
    const user = await UserRepository.findById(req.session.userId);
    if (!user || !user.access_token) {
      return res.status(401).json({ error: 'GitHub access token not found' });
    }

    // Create git-repos directory if it doesn't exist
    const gitReposDir = path.join(__dirname, '../../../git-repos');
    if (!fs.existsSync(gitReposDir)) {
      fs.mkdirSync(gitReposDir, { recursive: true });
    }

    // Generate unique directory name for this repo
    const repoSlug = repoName.replace('/', '-');
    const timestamp = Date.now();
    const repoDir = path.join(gitReposDir, `${timestamp}-${repoSlug}`);

    // Clone the repository using the access token
    const authenticatedUrl = repoUrl.replace(
      'https://github.com/',
      `https://${user.access_token}@github.com/`
    );

    console.log(`Cloning repository: ${repoName}`);
    
    try {
      await execAsync(`git clone ${authenticatedUrl} "${repoDir}"`, {
        timeout: 60000 // 60 second timeout
      });
    } catch (cloneError: any) {
      console.error('Git clone error:', cloneError);
      return res.status(500).json({ 
        error: 'Failed to clone repository',
        details: cloneError.message 
      });
    }

    // Verify the contracts path exists
    const contractsFullPath = path.join(repoDir, repoPath);
    if (!fs.existsSync(contractsFullPath)) {
      // Clean up cloned repo
      fs.rmSync(repoDir, { recursive: true, force: true });
      return res.status(400).json({ 
        error: `Contracts path '${repoPath}' not found in repository` 
      });
    }

    // Create project in database
    const projectDB = await ProjectRepository.create({
      user_id: req.session.userId,
      project_name: repoName,
      description: description?.trim() || null,
      project_type: 'github',
      github_repo_url: repoUrl,
      github_repo_path: repoPath,
      scan_approved: false,
      is_deployed: false
    });

    // Transform for frontend
    const project = transformProjectForFrontend(projectDB);

    res.status(201).json({
      message: 'Repository connected successfully',
      project,
      clonedPath: repoDir
    });

  } catch (error: any) {
    console.error('GitHub connect error:', error);
    res.status(500).json({ 
      error: 'Failed to connect repository',
      details: error.message 
    });
  }
});

export default router;
