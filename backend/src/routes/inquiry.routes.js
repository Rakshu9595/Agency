import { Router } from 'express';
import {
  handleCreateProjectInquiry,
  handleGetMyInquiries,
  handleGetInquiryById,
  handleUpdateInquiry,
} from '../controllers/inquiry.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Allow submitting project brief (can be authenticated or public)
router.post('/', (req, res, next) => {
  // If Bearer token is provided, verify it optionally
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return requireAuth(req, res, next);
  }
  next();
}, handleCreateProjectInquiry);

// Retrieve inquiries for current customer (supports both /me and /mine)
router.get('/me', requireAuth, handleGetMyInquiries);
router.get('/mine', requireAuth, handleGetMyInquiries);
router.get('/:id', requireAuth, handleGetInquiryById);
router.patch('/:id', requireAuth, handleUpdateInquiry);

export default router;
