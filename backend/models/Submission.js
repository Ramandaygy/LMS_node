const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      required: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    file_url: {
      type: String,
      default: '',
    },

    note: {
      type: String,
      default: '',
    },

    score: {
      type: Number,
      default: 0,
    },

    feedback: {
      type: String,
      default: '',
    },

    submitted_at: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: [
        'submitted',
        'graded',
        'late',
      ],
      default: 'submitted',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Submission',
  submissionSchema
);