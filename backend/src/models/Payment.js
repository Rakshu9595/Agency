import mongoose from 'mongoose';

export const PAYMENT_RECORD_STATUSES = ['captured', 'authorized', 'failed', 'refunded'];

const paymentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    orderReference: {
      type: String,
      required: true,
      index: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true,
    },
    razorpayPaymentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    razorpaySignature: {
      type: String,
      default: '',
    },
    signatureVerified: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    status: {
      type: String,
      enum: PAYMENT_RECORD_STATUSES,
      default: 'captured',
      index: true,
    },
    method: {
      type: String,
      default: 'card',
    },
    bank: {
      type: String,
      default: null,
    },
    wallet: {
      type: String,
      default: null,
    },
    vpa: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: '',
    },
    contact: {
      type: String,
      default: '',
    },
    verifiedAt: {
      type: Date,
      default: Date.now,
    },
    failureReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

paymentSchema.index({ customerId: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
