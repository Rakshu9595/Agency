import mongoose from 'mongoose';

export const MILESTONE_APPROVAL_STATES = ['pending', 'approved', 'rejected'];
export const MILESTONE_PAYMENT_STATES = ['unbilled', 'payable', 'pending_verification', 'paid'];

const milestoneSchema = new mongoose.Schema(
  {
    milestoneReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Milestone amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    order: {
      type: Number,
      default: 1,
    },
    completionCriteria: {
      type: String,
      trim: true,
      default: '',
    },
    approvalState: {
      type: String,
      enum: MILESTONE_APPROVAL_STATES,
      default: 'pending',
    },
    paymentState: {
      type: String,
      enum: MILESTONE_PAYMENT_STATES,
      default: 'unbilled',
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Milestone = mongoose.model('Milestone', milestoneSchema);
