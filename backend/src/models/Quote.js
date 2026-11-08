import mongoose from 'mongoose';

export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'approved',
  'changes_requested',
  'rejected',
  'expired',
];

const milestoneSchema = new mongoose.Schema(
  {
    milestoneId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'in_progress'],
      default: 'pending',
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
  },
  { _id: false }
);

const quoteSchema = new mongoose.Schema(
  {
    quoteReference: {
      type: String,
      required: [true, 'Quote reference is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectInquiry',
      default: null,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    lineItems: [
      {
        title: { type: String, required: true },
        description: { type: String, default: '' },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    advanceAmount: {
      type: Number,
      required: [true, 'Advance amount is required'],
      min: [0, 'Advance amount cannot be negative'],
    },
    advancePaid: {
      type: Boolean,
      default: false,
    },
    milestones: [milestoneSchema],
    scopeOfWork: {
      type: String,
      default: '',
    },
    includedRevisions: {
      type: String,
      default: '2 rounds of structured revisions',
    },
    supportPeriod: {
      type: String,
      default: '30 days technical support & bug fixing',
    },
    exclusions: {
      type: [String],
      default: ['Third-party API subscription costs', 'Paid fonts or premium domain acquisition'],
    },
    termsAndConditions: {
      type: String,
      default: '50% advance to initiate development. Balance upon milestone/completion review.',
    },
    clientFeedback: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: QUOTE_STATUSES,
      default: 'sent',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days default validity
    },
    approvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Quote = mongoose.model('Quote', quoteSchema);
