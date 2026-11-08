import mongoose from 'mongoose';

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ['received', 'processed', 'failed', 'ignored'],
      default: 'received',
      index: true,
    },
    payloadSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    receivedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    errorDetails: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema);
