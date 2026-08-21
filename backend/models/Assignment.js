const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deadline: { type: Date },
    due_date: { type: Date },
    max_score: { type: Number, default: 100 },
    kkm: { type: Number, default: 70 },
    session_number: { type: Number, default: 1 },
    attachments: [{
      type: { type: String, enum: ['file', 'link'] },
      value: String
    }],

    is_active: { type: Boolean, default: true },

    assignment_type: { type: String, enum: ['upload', 'structured'], default: 'upload' },
    questions: [{
      question_type: { type: String, enum: ['pilgan', 'essay'] },
      text: { type: String },
      options: [{ type: String }],
      correct_answer: { type: String },
      points: { type: Number, default: 10 }
    }],
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'Assignment',
  assignmentSchema
);