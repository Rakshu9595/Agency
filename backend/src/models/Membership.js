import mongoose from 'mongoose';

export const MEMBERSHIP_STATUSES = [
  'pending',
  'active',
  'past_due',
  'halted',
  'cancelled',
  'completed',
  'expired',
];

const membershipSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
    },
    planRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      default: null,
    },
    providerSubscriptionId: {
      type: String,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: MEMBERSHIP_STATUSES,
      default: 'pending',
      index: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    renewalDate: {
      type: Date,
      default: null,
    },
    cancellationScheduledDate: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    entitlements: {
      type: [String],
      default: [],
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

membershipSchema.index({ customerId: 1, status: 1 });

export const Membership = mongoose.model('Membership', membershipSchema);
