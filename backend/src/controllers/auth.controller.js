import { User } from '../models/User.js';
import { sendSuccess, sendError } from '../utils/api-response.js';
import { generateToken, hashPassword, verifyPassword } from '../utils/security.js';
import { isDatabaseConnected, memoryStore } from '../utils/memory-store.js';
import crypto from 'node:crypto';

/**
 * Handle new user registration.
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
      });

      await user.save();

      const token = generateToken({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
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
      });

      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
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
 * Handle user login.
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
      if (user) {
        isValidPassword = user.comparePassword(password);
      }
    } else {
      user = memoryStore.findUserByEmail(normalizedEmail);
      if (user) {
        isValidPassword = verifyPassword(password, user.password);
      }
    }

    if (!user || !isValidPassword) {
      return sendError(res, {
        statusCode: 401,
        message: 'Invalid email or password',
      });
    }

    if (user.status === 'suspended') {
      return sendError(res, {
        statusCode: 403,
        message: 'Your account is suspended. Please contact customer support.',
      });
    }

    user.lastLoginAt = new Date();
    if (typeof user.save === 'function') await user.save();

    const token = generateToken({
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Login successful',
      data: {
        user: typeof user.toSafeJSON === 'function' ? user.toSafeJSON() : { id: user.id, name: user.name, email: user.email, role: user.role },
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
      return sendSuccess(res, {
        statusCode: 200,
        message: 'If that email is registered, password reset instructions have been prepared.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    if (typeof user.save === 'function') await user.save();

    return sendSuccess(res, {
      statusCode: 200,
      message: 'If that email is registered, password reset instructions have been prepared.',
      data: {
        ...(process.env.NODE_ENV !== 'production' ? { resetTokenPreview: resetToken } : {}),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle password reset execution.
 */
export const handleResetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return sendError(res, { statusCode: 400, message: 'Token and new password are required' });
    }

    if (newPassword.length < 8) {
      return sendError(res, { statusCode: 400, message: 'New password must be at least 8 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    let user = null;
    if (isDatabaseConnected()) {
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() },
      }).select('+resetPasswordToken +resetPasswordExpires');
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
        message: 'Password reset token is invalid or has expired.',
      });
    }

    if (isDatabaseConnected()) {
      user.password = newPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
    } else {
      user.password = hashPassword(newPassword);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Password has been reset successfully. You can now sign in.',
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
    let user = isDatabaseConnected()
      ? await User.findById(req.user.id)
      : memoryStore.findUserById(req.user.id);

    if (!user) {
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Profile retrieved',
        data: {
          user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role },
        },
      });
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: 'Profile retrieved successfully',
      data: {
        user: typeof user.toSafeJSON === 'function' ? user.toSafeJSON() : { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
};
