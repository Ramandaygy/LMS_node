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
    
    // Konfigurasi Sistem Super Admin
    app_name: {
      type: String,
      default: 'LMS SMP NEGERI 1 SURADADI',
    },
    maintenance_mode: {
      type: Boolean,
      default: false,
    },
    session_timeout: {
      type: String,
      default: '12',
    },
    allow_reset_pwd: {
      type: Boolean,
      default: true,
    },
    gemini_api_key: {
      type: String,
      default: '',
    },
    
    // Threshold & Bobot Penilaian
    kkm_score: {
      type: Number,
      default: 75,
    },
    weight_nh: {
      type: Number,
      default: 40,
    },
    weight_uts: {
      type: Number,
      default: 30,
    },
    weight_uas: {
      type: Number,
      default: 30,
    },
    
    // Status Penginputan Nilai (Kunci Nilai)
    grade_input_status: {
      type: String,
      enum: ['auto', 'open', 'closed'],
      default: 'auto',
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