import mongoose from 'mongoose';

export const ORDER_TYPES = [
  'service_package',
  'project_advance',
  'project_milestone',
  'membership_one_time',
  'membership_subscription',
];

export const ORDER_STATUSES = ['created', 'processing', 'completed', 'failed', 'cancelled'];
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];

const orderSchema = new mongoose.Schema(
  {
    orderReference: {
      type: String,
      required: [true, 'Order reference is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer ID is required'],
      index: true,
    },
    orderType: {
      type: String,
      enum: ORDER_TYPES,
      required: [true, 'Order type is required'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: null,
    },
    milestoneId: {
      type: String,
      default: null,
    },
    membershipPlanId: {
      type: String,
      default: null,
    },
    razorpayOrderId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Order amount in standard currency unit (INR) is required'],
      min: [1, 'Order amount must be at least 1'],
    },
    amountInPaise: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: 'created',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: 'pending',
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    receiptNumber: {
      type: String,
      default: null,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

orderSchema.index({ customerId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);
