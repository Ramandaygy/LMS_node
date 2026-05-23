const mongoose = require('mongoose');

const SubmissionSchema = new mongoose.Schema({
  assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserSiswa', required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserGuru', required: true },
  status: String, // submitted, graded, etc.
  content: String,
  file: { type: String, default: null },
  score: { type: Number, default: null },
  feedback: String,
  submitted_at: { type: Date, default: Date.now },
  graded_at: Date
});

module.exports = mongoose.model('Submission', SubmissionSchema, 'submissions');