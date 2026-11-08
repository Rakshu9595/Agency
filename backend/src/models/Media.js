import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    altText: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: ['image', 'logo', 'portfolio', 'document', 'other'],
      default: 'image',
    },
    uploadedBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const Media = mongoose.models.Media || mongoose.model('Media', mediaSchema);
