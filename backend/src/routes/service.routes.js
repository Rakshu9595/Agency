import { Router } from 'express';
import {
  handleGetServices,
  handleGetServiceBySlug,
} from '../controllers/service.controller.js';

const router = Router();

router.get('/', handleGetServices);
router.get('/:slug', handleGetServiceBySlug);

export default router;
