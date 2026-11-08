import { Router } from 'express';
import {
  handleRegister,
  handleLogin,
  handleLogout,
  handleForgotPassword,
  handleResetPassword,
  handleGetMe,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', handleRegister);
router.post('/login', handleLogin);
router.post('/logout', handleLogout);
router.post('/forgot-password', handleForgotPassword);
router.post('/reset-password', handleResetPassword);
router.get('/me', requireAuth, handleGetMe);

export default router;
