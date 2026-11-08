import mongoose from 'mongoose';

export const SERVICE_STATUSES = ['active', 'inactive', 'archived'];

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Development',
    },
    tagline: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Tagline cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [3000, 'Description cannot exceed 3000 characters'],
    },
    startingPrice: {
      type: Number,
      required: [true, 'Starting price is required'],
      min: [0, 'Starting price cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    estimatedTimeline: {
      type: String,
      trim: true,
      default: '2-4 weeks',
    },
    deliverables: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    packages: [
      {
        id: String,
        name: String,
        price: Number,
        description: String,
        timeline: String,
        features: [String],
      },
    ],
    faqs: [
      {
        question: String,
        answer: String,
      },
    ],
    image: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: SERVICE_STATUSES,
      default: 'active',
      index: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    seoTitle: {
      type: String,
      default: '',
    },
    seoDescription: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Service = mongoose.models.Service || mongoose.model('Service', serviceSchema);
