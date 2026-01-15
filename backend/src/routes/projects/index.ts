import { Router } from 'express';
import uploadRouter from './upload';
import githubRouter from './github';

const router = Router();

// Mount routes
router.use('/', uploadRouter);
router.use('/', githubRouter);

// You can add more project routes here later:
// router.get('/', getAllProjects);
// router.get('/:id', getProjectById);
// router.put('/:id', updateProject);
// router.delete('/:id', deleteProject);

export default router;
