import mongoose from 'mongoose';

const siteContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    lastUpdatedBy: {
      type: String,
      default: 'system',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const SiteContent = mongoose.models.SiteContent || mongoose.model('SiteContent', siteContentSchema);
