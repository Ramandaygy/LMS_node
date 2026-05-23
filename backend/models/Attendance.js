const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true }, // mengacu ke courses
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSiswa', required: true },
  date: { type: String, required: true }, // format YYYY-MM-DD
  status: { type: String, enum: ['present', 'absent', 'late'], default: 'present' },
  note: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'attendance' });

module.exports = mongoose.model('Attendance', AttendanceSchema);