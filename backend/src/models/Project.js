import mongoose from 'mongoose';

export const PROJECT_STAGES = [
  'inquiry',
  'review',
  'quotation',
  'awaiting_advance',
  'design',
  'development',
  'testing',
  'awaiting_final_payment',
  'delivered',
];

export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'cancelled'];

const projectSchema = new mongoose.Schema(
  {
    projectReference: {
      type: String,
      required: [true, 'Project reference is required'],
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
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProjectInquiry',
      default: null,
      index: true,
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    websiteType: {
      type: String,
      trim: true,
      default: 'Business Website',
    },
    service: {
      type: String,
      trim: true,
      default: 'custom-web-application',
    },
    stage: {
      type: String,
      enum: {
        values: PROJECT_STAGES,
        message: '{VALUE} is not a valid project stage',
      },
      default: 'awaiting_advance',
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: PROJECT_STATUSES,
        message: '{VALUE} is not a valid project status',
      },
      default: 'active',
      index: true,
    },
    timeline: {
      type: String,
      trim: true,
      default: '3-4 weeks',
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    advanceAmount: {
      type: Number,
      required: true,
      min: [0, 'Advance amount cannot be negative'],
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: [0, 'Paid amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    assignedStaff: {
      type: String,
      trim: true,
      default: 'Agenet Engineering Lead',
    },
    stagingUrl: {
      type: String,
      trim: true,
      default: '',
    },
    liveUrl: {
      type: String,
      trim: true,
      default: '',
    },
    repositoryUrl: {
      type: String,
      trim: true,
      default: '',
    },
    deliverables: {
      type: [String],
      default: [],
    },
    startDate: {
      type: Date,
      default: null,
    },
    targetDeliveryDate: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Project = mongoose.model('Project', projectSchema);
