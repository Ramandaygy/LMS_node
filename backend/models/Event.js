const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['academic', 'holiday', 'exam', 'other'],
      default: 'other',
    },
    color: {
      type: String,
      default: '#0040a1',
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Event', eventSchema);
