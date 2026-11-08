import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    label: { type: String, default: 'Link' },
    url: { type: String, required: true },
  },
  { _id: false }
);

const projectUpdateSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    authorName: {
      type: String,
      default: 'Agency Lead',
    },
    updateMessage: {
      type: String,
      required: [true, 'Update message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    stage: {
      type: String,
      default: 'development',
    },
    attachments: [attachmentSchema],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ProjectUpdate = mongoose.model('ProjectUpdate', projectUpdateSchema);
