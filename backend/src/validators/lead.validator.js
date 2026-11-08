import { z } from 'zod';
import {
  CUSTOMER_TYPES,
  SERVICES,
  PREFERRED_CONTACT_METHODS,
  SUPPORTED_CURRENCIES,
} from '../models/Lead.js';
import { AppError } from '../utils/api-response.js';

// Prohibited fields for public submission to prevent mass assignment
const PROHIBITED_FIELDS = [
  'referenceId',
  'status',
  'source',
  'notes',
  '_id',
  'id',
  'createdAt',
  'updatedAt',
  '__v',
];

const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

/**
 * Zod schema for public lead inquiry submission
 */
export const leadSubmissionSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),

    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address')
      .max(254, 'Email cannot exceed 254 characters'),

    phone: z
      .string()
      .trim()
      .max(25, 'Phone cannot exceed 25 characters')
      .optional()
      .default(''),

    customerType: z.enum(CUSTOMER_TYPES, {
      errorMap: () => ({
        message: `Customer type must be one of: ${CUSTOMER_TYPES.join(', ')}`,
      }),
    }),

    service: z.enum(SERVICES, {
      errorMap: () => ({
        message: `Service must be one of: ${SERVICES.join(', ')}`,
      }),
    }),

    projectTitle: z
      .string()
      .trim()
      .max(150, 'Project title cannot exceed 150 characters')
      .optional()
      .default(''),

    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(5000, 'Description cannot exceed 5000 characters'),

    budgetAmount: z
      .preprocess((val) => {
        if (val === '' || val === null || val === undefined) return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
      }, z.number().min(0, 'Budget amount cannot be negative').max(1000000000, 'Budget amount is too large').nullable().optional())
      .default(null),

    budgetCurrency: z
      .enum(SUPPORTED_CURRENCIES, {
        errorMap: () => ({
          message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`,
        }),
      })
      .optional()
      .default('INR'),

    deadline: z
      .preprocess((val) => {
        if (!val || val === '') return null;
        return val;
      }, z.union([z.string(), z.date()]).nullable().optional())
      .refine(
        (val) => {
          if (!val) return true;
          const parsed = new Date(val);
          return !isNaN(parsed.getTime());
        },
        { message: 'Deadline must be a valid date' }
      )
      .transform((val) => (val ? new Date(val) : null))
      .default(null),

    referenceLinks: z
      .array(
        z
          .string()
          .trim()
          .max(500, 'Reference link cannot exceed 500 characters')
          .refine((val) => urlRegex.test(val), {
            message: 'Each reference link must be a valid HTTP or HTTPS URL',
          })
      )
      .max(10, 'Cannot provide more than 10 reference links')
      .optional()
      .default([]),

    preferredContact: z
      .enum(PREFERRED_CONTACT_METHODS, {
        errorMap: () => ({
          message: `Preferred contact must be one of: ${PREFERRED_CONTACT_METHODS.join(', ')}`,
        }),
      })
      .optional()
      .default('email'),

    privacyConsent: z
      .boolean({
        required_error: 'Privacy consent is required',
        invalid_type_error: 'Privacy consent must be a boolean',
      })
      .refine((val) => val === true, {
        message: 'You must agree to the privacy policy to submit an inquiry',
      }),

    // Honeypot field: Must remain empty or undefined
    website: z.string().optional().default(''),
  })
  .strict({
    message: 'Request contains unrecognized fields',
  });

/**
 * Express middleware to validate lead inquiry submissions.
 */
export const validateLeadSubmission = (req, res, next) => {
  // Check for explicit prohibited mass-assignment fields first
  const bodyKeys = Object.keys(req.body || {});
  const detectedProhibited = bodyKeys.filter((key) =>
    PROHIBITED_FIELDS.includes(key)
  );

  if (detectedProhibited.length > 0) {
    return next(
      new AppError(
        `Mass assignment prohibited: field(s) [${detectedProhibited.join(', ')}] cannot be specified through public submission.`,
        400,
        detectedProhibited.map((field) => ({
          field,
          message: `Field '${field}' is server-managed and prohibited.`,
        }))
      )
    );
  }

  // Honeypot spam check
  if (req.body.website && String(req.body.website).trim().length > 0) {
    return next(
      new AppError(
        'Spam detected. Submission rejected.',
        400,
        [{ field: 'website', message: 'Honeypot field was filled.' }]
      )
    );
  }

  // Execute Zod schema validation
  const result = leadSubmissionSchema.safeParse(req.body);

  if (!result.success) {
    const formattedErrors = result.error.errors.map((err) => ({
      field: err.path.join('.') || 'root',
      message: err.message,
    }));

    return next(
      new AppError(
        formattedErrors[0]?.message || 'Validation failed for inquiry submission',
        400,
        formattedErrors
      )
    );
  }

  // Remove honeypot field from sanitized body before reaching controller/service
  const sanitized = { ...result.data };
  delete sanitized.website;

  req.validatedBody = sanitized;
  next();
};
