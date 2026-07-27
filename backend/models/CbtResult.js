const mongoose = require('mongoose');

const cbtResultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'CbtExam', required: true },
  answers: [{
    question_index: { type: Number },
    selected_option: { type: Number, default: -1 }, // -1 if unanswered, or 0, 1, 2, 3
    is_flagged: { type: Boolean, default: false },
    is_correct: { type: Boolean, default: false }
  }],
  score: { type: Number, required: true }, // 0 - 100
  correct_count: { type: Number, default: 0 },
  wrong_count: { type: Number, default: 0 },
  unanswered_count: { type: Number, default: 0 },
  is_passed: { type: Boolean, default: false },
  time_spent_seconds: { type: Number, default: 0 },
  submitted_at: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('CbtResult', cbtResultSchema);
