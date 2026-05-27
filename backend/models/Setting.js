const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    school_name: {
      type: String,
      default: 'SMP N 1 SURADADI',
    },

    school_logo: {
      type: String,
      default: '',
    },

    academic_year: {
      type: String,
      default: '2025/2026',
    },

    semester: {
      type: String,
      default: 'Ganjil',
    },

    contact_email: {
      type: String,
      default: '',
    },

    contact_phone: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Setting',
  settingSchema
);