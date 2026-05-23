const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true },
  grade_level: { type: Number, required: true },
  homeroom_teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'UserGuru', default: null },
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  description: String,
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Class', ClassSchema, 'classes');