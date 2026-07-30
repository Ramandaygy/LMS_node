const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quiz_id: { type: mongoose.Schema.Types.ObjectId, ref: 'QuizBank', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  student_name: { type: String, required: true },
  nisn: { type: String, default: '' },
  class_name: { type: String, required: true },
  session_number: { type: Number, default: 1 },
  answers: [{
    question_index: Number,
    selected_option: Number,
    is_correct: Boolean,
    points_earned: Number
  }],
  total_score: { type: Number, default: 0 },
  max_score: { type: Number, default: 100 },
  star_rating: { type: Number, default: 5 },
  submitted_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);
