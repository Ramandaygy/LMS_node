const mongoose = require('mongoose');

const AcademicYearSchema = new mongoose.Schema({
  name: String,
  year: String,
  semester: String,
  start_date: String,
  end_date: String,
  is_active: { type: Boolean, default: false },
  is_current: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AcademicYear', AcademicYearSchema, 'academic_years');