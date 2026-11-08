import { Router } from 'express';
import {
  handleCreatePaymentOrder,
  handleVerifyPayment,
  handleWebhook,
  handleGetPaymentHistory,
  handleGetOrderStatus,
  handleCreateRefundRequest,
  handleGetReceipt,
} from '../controllers/payment.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Webhook endpoint (public with signature verification on raw body)
router.post('/webhook', handleWebhook);

// Protected payment endpoints
router.post('/orders', requireAuth, handleCreatePaymentOrder);
router.post('/verify', requireAuth, handleVerifyPayment);
router.get('/history', requireAuth, handleGetPaymentHistory);
router.get('/:orderReference', requireAuth, handleGetOrderStatus);
router.post('/:orderReference/refund-requests', requireAuth, handleCreateRefundRequest);
router.get('/:orderReference/receipt', requireAuth, handleGetReceipt);

export default router;
