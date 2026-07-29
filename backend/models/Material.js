// models/Material.js
const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  content: { type: String, default: '' }, // konten teks/HTML
  class_id: { type: mongoose.Schema.Types.Mixed, default: null },
  class_name: { type: String, default: '' },
  grade_level: { type: String, default: 'all' }, // '7', '8', '9', 'all'
  subject_id: { type: mongoose.Schema.Types.Mixed, default: null },
  subject_name: { type: String, default: '' },
  uploaded_by: { type: mongoose.Schema.Types.Mixed, required: false }, // guru
  file_url: { type: String, default: '' }, // path file upload
  file_name: { type: String, default: '' },
  file_size: { type: Number, default: 0 },
  file_type: { type: String, default: '' },
  external_link: { type: String, default: '' }, // link eksternal
  is_published: { type: Boolean, default: true },
  session_number: { type: Number, default: 1 },
  order: { type: Number, default: 0 },
  source_type: { type: String, enum: ['manual', 'ai'], default: 'manual' },
  ai_prompt: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);