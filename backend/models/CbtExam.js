const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  question_text: { type: String, required: true },
  options: [{ type: String, required: true }], // Array of 4 options: [A, B, C, D]
  correct_option: { type: Number, required: true }, // Index 0, 1, 2, or 3
  explanation: { type: String, default: '' } // Pembahasan soal
});

const cbtExamSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  subject: { type: mongoose.Schema.Types.Mixed, default: null },
  subject_name: { type: String, default: '' },
  class_id: { type: mongoose.Schema.Types.Mixed, default: null },
  class_name: { type: String, default: '' },
  teacher: { type: mongoose.Schema.Types.Mixed, required: false },
  duration_minutes: { type: Number, default: 30 },
  pass_score: { type: Number, default: 75 },
  is_master: { type: Boolean, default: false },
  is_active: { type: Boolean, default: true },
  session_number: { type: Number, default: 1 },
  start_time: { type: Date, default: null },
  end_time: { type: Date, default: null },
  hide_correct_answers: { type: Boolean, default: true },
  questions: [questionSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('CbtExam', cbtExamSchema);
