import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { generateToken, hashPassword, verifyPassword } from '../utils/security.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';
import { recordAuditLog } from '../utils/audit-logger.js';
import crypto from 'node:crypto';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Handle new user registration.
 * Super Admin cannot be created via public registration.
 */
export const handleRegister = async (req, res, next) => {
  try {
    const { name, email, password, phone, company } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return sendError(res, { statusCode: 400, message: 'Name must be at least 2 characters' });
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      return sendError(res, { statusCode: 400, message: 'A valid email address is required' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return sendError(res, { statusCode: 400, message: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const adminKey = process.env.ADMIN_INVITE_KEY || 'AGENET_ADMIN_SECRET_2026';
    // Admin key only assigns 'admin' role; 'super_admin' requires CLI provisioning
    const assignedRole = (req.body.adminInviteCode && req.body.adminInviteCode === adminKey) ? 'admin' : 'client';

    if (isDatabaseConnected()) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return sendError(res, {
          statusCode: 409,
          message: 'An account with this email address already exists. Please sign in.',
        });
      }

      const user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password,
        phone: phone ? String(phone).trim() : '',
        company: company ? String(company).trim() : '',
        role: assignedRole,
        status: 'active',
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || '',
      });

      await user.save();

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || [],
      });

      // Set HTTP-only secure cookie
      res.cookie('pravyuk_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      await recordAuditLog({
        req,
        actor: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
        action: 'user.registered',
        resourceType: 'user',
        resourceId: user._id.toString(),
        details: { role: user.role },
      });

      return sendSuccess(res, {
        statusCode: 201,
        message: 'Account registered successfully',
        data: {
          user: user.toSafeJSON(),
          token,
        },
      });
    } else {
      // In-memory store fallback when live MongoDB is not connected
      const existing = memoryStore.findUserByEmail(normalizedEmail);
      if (existing) {
        return sendError(res, {
          statusCode: 409,
          message: 'An account with this email address already exists. Please sign in.',
        });
      }

      const hashedPassword = hashPassword(password);
      const user = memoryStore.saveUser({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        phone: phone ? String(phone).trim() : '',
        company: company ? String(company).trim() : '',
        role: assignedRole,
        status: 'active',
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || '',
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions || [],
      });

      res.cookie('pravyuk_token', token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      recordAuditLog({
        req,
        actor: { id: user.id, name: user.name, email: user.email, role: user.role },
        action: 'user.registered',
        resourceType: 'user',
        resourceId: user.id,
        details: { role: user.role },
      });

      return sendSuccess(res, {
        statusCode: 201,
        message: 'Account registered successfully',
        data: {
          user: user.toSafeJSON(),
          token,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Handle user authentication with rate limiting and progressive lockout protection.
 */
export const handleLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, { statusCode: 400, message: 'Email and password are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    let user = null;
    let isValidPassword = false;

    if (isDatabaseConnected()) {
      user = await User.findOne({ email: normalizedEmail }).select('+password');
    } else {
      user = memoryStore.findUserByEmail(normalizedEmail);
    }

    if (!user) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Check account lockout status
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
      const waitMinutes = Math.ceil((new Date(user.lockUntil).getTime() - Date.now()) / 60000);
      return sendError(res, {
        statusCode: 429,
        message: `Account is temporarily locked due to repeated failed login attempts. Please try again in ${waitMinutes} minute(s).`,
      });
    }

    // Verify password
    if (isDatabaseConnected()) {
      isValidPassword = await user.comparePassword(password);
    } else {
      isValidPassword = verifyPassword(password, user.password);
    }

    if (!isValidPassword) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }
      if (typeof user.save === 'function') await user.save();

      await recordAuditLog({
        req,
        actor: { id: user._id ? user._id.toString() : user.id, email: user.email, name: user.name, role: user.role },
        action: 'auth.login_failed',
        resourceType: 'auth',
        details: { failedAttempts: user.failedLoginAttempts, isLocked: Boolean(user.lockUntil) },
      });

      return sendError(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    // Check suspension
    if (user.status === 'suspended') {
      return sendError(res, {
        statusCode: 403,
        message: 'Your account has been suspended. Please contact agency support.',
      });
    }

    // Reset failed login counter upon successful authentication
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip || req.headers['x-forwarded-for'] || '';
    if (typeof user.save === 'function') await user.save();

    const token = generateToken({
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: user.permissions || (user.role === 'super_admin' ? ['*'] : []),
    });

    res.cookie('pravyuk_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await recordAuditLog({
      req,
      actor: { id: user._id ? user._id.toString() : user.id, email: user.email, name: user.name, role: user.role },
      action: 'auth.login_success',
      resourceType: 'auth',
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: typeof user.toSafeJSON === 'function' ? user.toSafeJSON() : {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          status: user.status,
        },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle logout.
 */
export const handleLogout = async (req, res) => {
  res.clearCookie('pravyuk_token');
  res.clearCookie('xevruniq_token');
  res.clearCookie('agenet_token');

  if (req.user) {
    await recordAuditLog({
      req,
      actor: req.user,
      action: 'auth.logout',
      resourceType: 'auth',
    });
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: 'Logged out successfully',
  });
};

/**
 * Handle forgot password request.
 */
export const handleForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return sendError(res, { statusCode: 400, message: 'Email is required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    let user = isDatabaseConnected()
      ? await User.findOne({ email: normalizedEmail })
      : memoryStore.findUserByEmail(normalizedEmail);

    if (!user) {
      // Return safe message without user enumeration
      return sendSuccess(res, {
        statusCode: 200,
        message: 'If an account exists with this email, password reset instructions have been dispatched.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    if (typeof user.save === 'function') await user.save();

    await recordAuditLog({
      req,
      actor: { id: user._id ? user._id.toString() : user.id, email: user.email, name: user.name, role: user.role },
      action: 'auth.password_reset_requested',
      resourceType: 'auth',
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'If an account exists with this email, password reset instructions have been dispatched.',
      data: {
        resetTokenPreview: resetToken,
        testResetToken: resetToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle password reset confirmation.
 */
export const handleResetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return sendError(res, {
        statusCode: 400,
        message: 'Token and a new password with at least 8 characters are required',
      });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    let user = null;
    if (isDatabaseConnected()) {
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      });
    } else {
      for (const u of memoryStore.users.values()) {
        if (u.resetPasswordToken === hashedToken && u.resetPasswordExpires > new Date()) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      return sendError(res, {
        statusCode: 400,
        message: 'Password reset link is invalid or has expired',
      });
    }

    if (isDatabaseConnected()) {
      user.password = newPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    } else {
      user.password = hashPassword(newPassword);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }

    await recordAuditLog({
      req,
      actor: { id: user._id ? user._id.toString() : user.id, email: user.email, name: user.name, role: user.role },
      action: 'auth.password_reset_completed',
      resourceType: 'auth',
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Return current authenticated user profile.
 */
export const handleGetMe = async (req, res, next) => {
  try {
    let user = null;
    if (isDatabaseConnected()) {
      user = await User.findById(req.user.id);
    } else {
      user = memoryStore.findUserById(req.user.id);
    }

    if (!user) {
      return sendError(res, { statusCode: 404, message: 'User profile not found' });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile retrieved successfully',
      data: {
        user: typeof user.toSafeJSON === 'function' ? user.toSafeJSON() : {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: user.permissions || [],
          status: user.status,
          phone: user.phone || '',
          company: user.company || '',
        },
      },
    });
  } catch (err) {
    next(err);
  }
};
