import { Router } from 'express';
import {
  handleGetPlans,
  handleGetMyMembership,
  handleCancelMembership,
  handleGetMyEntitlements,
} from '../controllers/membership.controller.js';
import { handleCreatePaymentOrder } from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public plans
router.get('/plans', handleGetPlans);

// Authenticated membership management
router.use(requireAuth);

router.post('/subscribe', (req, res, next) => {
  req.body.orderType = 'membership_subscription';
  return handleCreatePaymentOrder(req, res, next);
});

router.get('/me', handleGetMyMembership);
router.post('/cancel', handleCancelMembership);
router.get('/me/entitlements', handleGetMyEntitlements);

export default router;
