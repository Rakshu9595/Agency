import { Router } from 'express';
import { handleGetDashboardSummary } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/summary', requireAuth, handleGetDashboardSummary);

export default router;
