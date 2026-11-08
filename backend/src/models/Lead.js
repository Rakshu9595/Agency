import mongoose from 'mongoose';

export const CUSTOMER_TYPES = [
  'business',
  'startup',
  'student',
  'individual',
  'other',
];

export const SERVICES = [
  'website-development',
  'ecommerce-development',
  'custom-software',
  'ai-automation',
  'ui-ux-design',
  'student-project-support',
  'other',
];

export const PREFERRED_CONTACT_METHODS = ['email', 'phone', 'whatsapp'];

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
];

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'CAD', 'AUD'];

const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

const leadSchema = new mongoose.Schema(
  {
    referenceId: {
      type: String,
      required: [true, 'Reference ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      immutable: true, // Cannot be altered once set
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      maxlength: [254, 'Email cannot exceed 254 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      maxlength: [25, 'Phone number cannot exceed 25 characters'],
    },
    customerType: {
      type: String,
      required: [true, 'Customer type is required'],
      enum: {
        values: CUSTOMER_TYPES,
        message: '{VALUE} is not a valid customer type',
      },
    },
    service: {
      type: String,
      required: [true, 'Service selection is required'],
      enum: {
        values: SERVICES,
        message: '{VALUE} is not a supported service',
      },
    },
    projectTitle: {
      type: String,
      trim: true,
      default: '',
      maxlength: [150, 'Project title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    budgetAmount: {
      type: Number,
      min: [0, 'Budget amount cannot be negative'],
      max: [1000000000, 'Budget amount is too large'],
      default: null,
    },
    budgetCurrency: {
      type: String,
      enum: {
        values: SUPPORTED_CURRENCIES,
        message: '{VALUE} is not a supported currency',
      },
      default: 'INR',
    },
    deadline: {
      type: Date,
      default: null,
    },
    referenceLinks: {
      type: [
        {
          type: String,
          trim: true,
          maxlength: [500, 'Reference link cannot exceed 500 characters'],
          match: [urlRegex, 'Reference link must be a valid HTTP/HTTPS URL'],
        },
      ],
      default: [],
      validate: [
        (val) => val.length <= 10,
        'Cannot provide more than 10 reference links',
      ],
    },
    preferredContact: {
      type: String,
      enum: {
        values: PREFERRED_CONTACT_METHODS,
        message: '{VALUE} is not a valid contact method',
      },
      default: 'email',
    },
    privacyConsent: {
      type: Boolean,
      required: [true, 'Privacy consent is mandatory'],
      validate: {
        validator: (v) => v === true,
        message: 'Explicit privacy consent is required',
      },
    },
    status: {
      type: String,
      enum: {
        values: LEAD_STATUSES,
        message: '{VALUE} is not a valid lead status',
      },
      default: 'new',
      index: true,
    },
    source: {
      type: String,
      trim: true,
      default: 'website',
      immutable: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      select: false, // Do not expose in normal queries
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Optimize query performance
leadSchema.index({ createdAt: -1 });

export const Lead = mongoose.model('Lead', leadSchema);
