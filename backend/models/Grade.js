const mongoose = require('mongoose');

const GradeSchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSiswa', required: true },
  assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  score: { type: Number, default: 0 },
  feedback: { type: String, default: '' },
  graded_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { collection: 'grades' });

module.exports = mongoose.model('Grade', GradeSchema);