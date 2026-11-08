import mongoose from 'mongoose';
import { hashPassword, verifyPassword } from '../utils/security.js';

export const USER_ROLES = ['client', 'admin'];
export const USER_STATUSES = ['active', 'suspended', 'pending'];

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
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Hash password before saving
userSchema.pre('save', function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = hashPassword(this.password);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password instance method
userSchema.methods.comparePassword = function (candidatePassword) {
  return verifyPassword(candidatePassword, this.password);
};

// Safe JSON serialization
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    phone: this.phone,
    company: this.company,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };
};

export const User = mongoose.model('User', userSchema);
