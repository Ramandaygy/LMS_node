const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question_text: { type: String, required: true },
  options: [{ type: String, required: true }], // Array of 4 options: [A, B, C, D]
  correct_option: { type: Number, required: true }, // Index 0, 1, 2, or 3
  explanation: { type: String, default: '' } // Pembahasan soal
});

const cbtExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: false },
  class_name: { type: String, default: '' },
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  duration_minutes: { type: Number, default: 30 },
  pass_score: { type: Number, default: 75 },
  is_active: { type: Boolean, default: true },
  questions: [questionSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('CbtExam', cbtExamSchema);
