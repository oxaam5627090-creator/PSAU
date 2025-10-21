import { Router } from 'express';
import { authenticate } from '../utils/authMiddleware.js';
import { getOverview } from '../controllers/adminController.js';

const router = Router();

router.get('/overview', authenticate, getOverview);

export default router;
