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

    school_address: {
      type: String,
      default: 'Jl. Raya Purwahamba No. 76, Suradadi, Kab. Tegal 52182',
    },

    headmaster_name: {
      type: String,
      default: 'Drs. H. Mulyono, M.Pd.',
    },

    headmaster_nip: {
      type: String,
      default: '19670812 199303 1 004',
    },

    signature_date: {
      type: String,
      default: '19 Juni 2026',
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