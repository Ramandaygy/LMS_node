const mongoose = require('mongoose');

const quizQuestionSchema = new mongoose.Schema({
  question_text: { type: String, required: true },
  options: [{ type: String }],
  correct_option: { type: Number, default: 0 },
  answer: { type: String, default: '' },
  points: { type: Number, default: 10 },
  time_limit_seconds: { type: Number, default: 30 }
});

const quizBankSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  subject_name: { type: String, default: 'Informatika' },
  grade_level: { type: String, default: '8' },
  teacher: { type: mongoose.Schema.Types.Mixed, required: false },
  class_id: { type: mongoose.Schema.Types.Mixed, default: null },
  class_name: { type: String, default: '' },
  session_number: { type: Number, default: 1 },
  is_master: { type: Boolean, default: true },
  is_active: { type: Boolean, default: true },
  questions: [quizQuestionSchema]
}, { timestamps: true });

module.exports = mongoose.model('QuizBank', quizBankSchema);
