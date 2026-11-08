import { Router } from 'express';
import { handleCreateLead } from '../controllers/lead.controller.js';
import { validateLeadSubmission } from '../validators/lead.validator.js';
import { leadSubmissionLimiter } from '../middleware/rate-limit.middleware.js';

const router = Router();

// Public lead submission endpoint
router.post(
  '/',
  leadSubmissionLimiter,
  validateLeadSubmission,
  handleCreateLead
);

export default router;
