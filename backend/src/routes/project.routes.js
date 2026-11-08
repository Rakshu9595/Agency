import { Router } from 'express';
import {
  handleGetProjects,
  handleGetProjectBySlug,
  handleGetMyProjects,
  handleGetClientProjectById,
  handleGetProjectUpdates,
  handleGetProjectMilestones,
  PORTFOLIO_PROJECTS,
} from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// Public portfolio listing
router.get('/', handleGetProjects);

// Authenticated client projects
router.get('/mine', requireAuth, handleGetMyProjects);

// Dynamic router resolving portfolio slug or client project ID
router.get('/:identifier', (req, res, next) => {
  const { identifier } = req.params;
  const isPortfolio = PORTFOLIO_PROJECTS.some((p) => p.slug === identifier.toLowerCase());

  if (isPortfolio) {
    return handleGetProjectBySlug(req, res, next);
  }

  // If not a public portfolio item, route to client project by reference or ID
  return requireAuth(req, res, () => handleGetClientProjectById(req, res, next));
});

router.get('/:id/updates', requireAuth, handleGetProjectUpdates);
router.get('/:id/milestones', requireAuth, handleGetProjectMilestones);

export default router;
