import { Router } from 'express';
import uploadRouter from './upload';

const router = Router();

// Mount upload route
router.use('/', uploadRouter);

// You can add more project routes here later:
// router.get('/', getAllProjects);
// router.get('/:id', getProjectById);
// router.put('/:id', updateProject);
// router.delete('/:id', deleteProject);

export default router;
