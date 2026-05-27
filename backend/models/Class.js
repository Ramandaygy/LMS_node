const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    grade: {
      type: String,
      required: true,
    },

    major: {
      type: String,
      default: '',
    },

    homeroom_teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    academic_year: {
      type: String,
      default: '2025/2026',
    },

    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

module.exports =
  mongoose.model('Class', classSchema);