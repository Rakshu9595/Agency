import mongoose from 'mongoose';
import { hashPassword, verifyPassword } from '../utils/security.js';

export const USER_ROLES = ['client', 'staff', 'admin', 'super_admin'];
export const USER_STATUSES = ['active', 'suspended', 'pending'];

export const ALL_PERMISSIONS = [
  'dashboard.read',
  'customers.read',
  'customers.update',
  'services.manage',
  'pricing.manage',
  'portfolio.manage',
  'inquiries.manage',
  'quotations.manage',
  'projects.manage',
  'payments.read',
  'refunds.manage',
  'content.manage',
  'seo.manage',
  'settings.manage',
  'admins.manage',
  'audit.read',
];

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Do not expose password hash in normal queries
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: '{VALUE} is not a valid user role',
      },
      default: 'client',
      index: true,
    },
    permissions: {
      type: [String],
      default: function () {
        if (this.role === 'super_admin') return ['*'];
        if (this.role === 'admin') {
          return [
            'dashboard.read',
            'customers.read',
            'services.manage',
            'pricing.manage',
            'portfolio.manage',
            'inquiries.manage',
            'quotations.manage',
            'projects.manage',
            'payments.read',
            'content.manage',
            'seo.manage',
          ];
        }
        if (this.role === 'staff') {
          return ['dashboard.read', 'inquiries.manage', 'projects.manage'];
        }
        return [];
      },
    },
    status: {
      type: String,
      enum: {
        values: USER_STATUSES,
        message: '{VALUE} is not a valid account status',
      },
      default: 'active',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [25, 'Phone number cannot exceed 25 characters'],
    },
    company: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    resetPasswordToken: {
      type: String,
      default: null,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
      select: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Pre-save hook to hash password if modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return verifyPassword(candidatePassword, this.password);
};

// Return sanitized representation omitting password and internal fields
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id ? this._id.toString() : this.id,
    name: this.name,
    email: this.email,
    role: this.role,
    permissions: this.permissions || [],
    status: this.status,
    phone: this.phone || '',
    company: this.company || '',
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
