import { Router } from 'express';
import * as files from '../controllers/files.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/*key', authenticate, files.download);

export default router;
