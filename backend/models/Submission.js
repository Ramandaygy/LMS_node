const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  assignment_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: { type: String, default: '' },
  link: { type: String, default: '' },
  file: { type: String, default: '' },
  submitted_at: { type: Date, default: Date.now },
  score: { type: Number, default: null },
  feedback: { type: String, default: '' },
  graded_at: { type: Date, default: null },
  graded_by: { type: mongoose.Schema.Types.ObjectId, default: null },

  answers: [{
    question_id: { type: mongoose.Schema.Types.ObjectId },
    answer_text: { type: String }, // For both text essay or selected option
    is_correct: { type: Boolean, default: false }, // Auto-graded for pilgan
    points_earned: { type: Number, default: 0 } // Points for this specific question
  }],
  pilgan_score: { type: Number, default: 0 },
  essay_score: { type: Number, default: 0 }
}, { timestamps: true });

submissionSchema.index({ student_id: 1, score: 1 });

module.exports = mongoose.model('Submission', submissionSchema);