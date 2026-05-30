const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },

    grade_level: {
      type: Number,
      required: true,
    },

    major: {
      type: String,
      default: '',
    },

    homeroom_teacher: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    academic_year_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
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

module.exports = mongoose.model(
  'Class',
  classSchema
);