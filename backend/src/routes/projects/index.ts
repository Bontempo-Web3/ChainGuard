import { Router } from 'express';
import uploadRouter from './upload';
import githubRouter from './github';
import monitorRouter from './monitor';
import listRouter from './list';
import deleteRouter from './delete';

const router = Router();

// Mount routes
router.use('/', listRouter);
router.use('/', uploadRouter);
router.use('/', githubRouter);
router.use('/', monitorRouter);
router.use('/', deleteRouter);

export default router;
