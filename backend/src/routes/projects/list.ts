import { Router, Request, Response } from 'express';
import { ProjectRepository } from '../../repositories/ProjectRepository';
import { ContractRepository } from '../../repositories/ContractRepository';
import { transformProjectForFrontend } from '../../lib/projectTransform';
import { transformContractForFrontend } from '../../lib/contractTransform';

const router = Router();

// GET /api/projects - List all projects for authenticated user
router.get('/', async (req: Request, res: Response) => {
  try {
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get all projects for this user
    const projectsDB = await ProjectRepository.findByUserId(req.session.userId);

    // For each project, get associated contracts
    const projectsWithContracts = await Promise.all(
      projectsDB.map(async (projectDB) => {
        const project = transformProjectForFrontend(projectDB);
        
        // Get contracts for this project
        const contractsDB = await ContractRepository.findByProjectId(projectDB.id);
        const contracts = contractsDB.map(transformContractForFrontend);

        return {
          ...project,
          contracts
        };
      })
    );

    res.json(projectsWithContracts);

  } catch (error: any) {
    console.error('List projects error:', error);
    res.status(500).json({ 
      error: 'Failed to list projects',
      details: error.message 
    });
  }
});

export default router;
