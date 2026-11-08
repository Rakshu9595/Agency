import mongoose from 'mongoose';

export const INQUIRY_STATUSES = [
  'submitted',
  'new',
  'under_review',
  'needs_information',
  'quoted',
  'accepted',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
];

const projectInquirySchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: [true, 'Reference ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [25, 'Phone cannot exceed 25 characters'],
    },
    company: {
      type: String,
      trim: true,
      default: '',
      maxlength: [120, 'Company cannot exceed 120 characters'],
    },
    websiteType: {
      type: String,
      trim: true,
      default: 'Business Website',
    },
    service: {
      type: String,
      required: [true, 'Service is required'],
      trim: true,
    },
    projectTitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description/brief is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    targetAudience: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Target audience cannot exceed 1000 characters'],
    },
    requiredPages: {
      type: String,
      trim: true,
      default: '',
    },
    requiredFeatures: {
      type: String,
      trim: true,
      default: '',
    },
    preferredTech: {
      type: String,
      trim: true,
      default: '',
    },
    existingWebsiteUrl: {
      type: String,
      trim: true,
      default: '',
    },
    designPreferences: {
      type: String,
      trim: true,
      default: '',
    },
    additionalNotes: {
      type: String,
      trim: true,
      default: '',
    },
    budgetRange: {
      type: String,
      trim: true,
      default: '',
    },
    budgetAmount: {
      type: Number,
      default: null,
      min: [0, 'Budget cannot be negative'],
    },
    timeline: {
      type: String,
      trim: true,
      default: '',
    },
    referenceLinks: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: INQUIRY_STATUSES,
      default: 'submitted',
      index: true,
    },
    assignedQuoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote',
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

projectInquirySchema.index({ createdAt: -1 });

export const ProjectInquiry = mongoose.model('ProjectInquiry', projectInquirySchema);
