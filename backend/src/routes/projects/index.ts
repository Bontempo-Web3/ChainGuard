import { Router } from 'express';
import uploadRouter from './upload';
import githubRouter from './github';
import monitorRouter from './monitor';
import listRouter from './list';

const router = Router();

// Mount routes
router.use('/', listRouter);
router.use('/', uploadRouter);
router.use('/', githubRouter);
router.use('/', monitorRouter);

export default router;
