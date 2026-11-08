import { Router } from 'express';
import {
  handleGetMyQuotes,
  handleGetQuoteByReference,
  handleAcceptQuote,
  handleRequestQuoteChanges,
  handleRejectQuote,
  handleCreateQuote,
} from '../controllers/quote.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);

router.get('/me', handleGetMyQuotes);
router.get('/mine', handleGetMyQuotes);
router.get('/:quoteReference', handleGetQuoteByReference);
router.post('/:quoteReference/accept', handleAcceptQuote);
router.post('/:quoteReference/request-changes', handleRequestQuoteChanges);
router.post('/:quoteReference/reject', handleRejectQuote);

// Admin route to issue a quote
router.post('/', requireAdmin, handleCreateQuote);

export default router;
