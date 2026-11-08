import mongoose from 'mongoose';

export const BILLING_INTERVALS = ['monthly', 'yearly', 'one_time'];

const membershipPlanSchema = new mongoose.Schema(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    billingInterval: {
      type: String,
      enum: BILLING_INTERVALS,
      default: 'monthly',
    },
    features: {
      type: [String],
      default: [],
    },
    entitlements: {
      type: [String],
      default: [],
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    razorpayPlanId: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const MembershipPlan = mongoose.model('MembershipPlan', membershipPlanSchema);
