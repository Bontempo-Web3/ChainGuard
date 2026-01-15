import { Router, Request, Response } from 'express';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { ContractRepository } from '../../repositories/ContractRepository';
import fs from 'fs';
import path from 'path';

const router = Router();

// DELETE /api/projects/:id - Delete project and related data
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const projectId = parseInt(req.params.id);

    if (isNaN(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Get project to verify ownership and get file paths
    const project = await ProjectRepository.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify user owns this project
    if (project.user_id !== req.session.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this project' });
    }

    // Delete associated files (ZIP or cloned repo)
    if (project.zip_file_path && fs.existsSync(project.zip_file_path)) {
      try {
        fs.unlinkSync(project.zip_file_path);
        console.log(`Deleted ZIP file: ${project.zip_file_path}`);
      } catch (err) {
        console.error('Error deleting ZIP file:', err);
      }
    }

    if (project.github_repo_url && project.project_type === 'github') {
      // Construct the cloned repo path
      const repoSlug = project.project_name.replace('/', '-');
      const gitReposDir = path.join(__dirname, '../../../git-repos');
      
      // Find directories matching this project
      if (fs.existsSync(gitReposDir)) {
        const files = fs.readdirSync(gitReposDir);
        const matchingDirs = files.filter(file => file.includes(repoSlug));
        
        matchingDirs.forEach(dir => {
          const dirPath = path.join(gitReposDir, dir);
          try {
            fs.rmSync(dirPath, { recursive: true, force: true });
            console.log(`Deleted cloned repo: ${dirPath}`);
          } catch (err) {
            console.error('Error deleting cloned repo:', err);
          }
        });
      }
    }

    // Delete contracts first (though CASCADE should handle this)
    const deletedContracts = await ContractRepository.deleteByProjectId(projectId);
    console.log(`Deleted ${deletedContracts} contracts for project ${projectId}`);

    // Delete project (will cascade delete contracts due to ON DELETE CASCADE)
    const deleted = await ProjectRepository.delete(projectId);

    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete project' });
    }

    res.json({
      message: 'Project deleted successfully',
      deletedContracts
    });

  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ 
      error: 'Failed to delete project',
      details: error.message 
    });
  }
});

export default router;
