import mongoose from 'mongoose';

export const REFUND_STATUSES = ['requested', 'approved', 'rejected', 'processed', 'failed'];

const refundSchema = new mongoose.Schema(
  {
    refundReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: REFUND_STATUSES,
      default: 'requested',
      index: true,
    },
    razorpayRefundId: {
      type: String,
      default: null,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    adminNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Refund = mongoose.model('Refund', refundSchema);
