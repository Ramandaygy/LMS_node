const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },

    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assignment',
      default: null,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    score: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: [
        'tugas',
        'uts',
        'uas',
        'quiz',
      ],
      default: 'tugas',
    },

    note: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Grade',
  gradeSchema
);