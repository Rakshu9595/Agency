import { Router } from 'express';
import {
  handleGetAdminSummary,
  handleGetAdminInquiries,
  handleUpdateInquiryStatus,
  handleGetAdminProjects,
  handleUpdateProjectStage,
  handleCreateProjectUpdate,
  handleAddProjectMilestone,
  handleSetMilestonePayable,
  handleGetAdminPayments,
  handleProcessRefund,
  handleGetLeads,
  handleGetLeadById,
  handleUpdateLead,
} from '../controllers/admin.controller.js';
import { handleCreateQuote } from '../controllers/quote.controller.js';
import { requireAuth, requireAdmin, requireAdminAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Backward compatibility with health.test.js for Phase 2 Lead placeholder
router.get('/leads', requireAdminAuth, handleGetLeads);
router.get('/leads/:id', requireAdminAuth, handleGetLeadById);
router.patch('/leads/:id', requireAdminAuth, handleUpdateLead);

// Real Authenticated Administrative Agency Routes
router.get('/summary', requireAuth, requireAdmin, handleGetAdminSummary);
router.get('/inquiries', requireAuth, requireAdmin, handleGetAdminInquiries);
router.patch('/inquiries/:id/status', requireAuth, requireAdmin, handleUpdateInquiryStatus);
router.post('/quotes', requireAuth, requireAdmin, handleCreateQuote);
router.get('/projects', requireAuth, requireAdmin, handleGetAdminProjects);
router.patch('/projects/:id/stage', requireAuth, requireAdmin, handleUpdateProjectStage);
router.post('/projects/:id/updates', requireAuth, requireAdmin, handleCreateProjectUpdate);
router.post('/projects/:id/milestones', requireAuth, requireAdmin, handleAddProjectMilestone);
router.patch('/milestones/:id/payable', requireAuth, requireAdmin, handleSetMilestonePayable);
router.get('/payments', requireAuth, requireAdmin, handleGetAdminPayments);
router.patch('/refunds/:id', requireAuth, requireAdmin, handleProcessRefund);

export default router;
