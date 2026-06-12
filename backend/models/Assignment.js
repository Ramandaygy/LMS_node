const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deadline: { type: Date, required: true }, // sudah include jam
    max_score: { type: Number, default: 100 },
    kkm: { type: Number, default: 70 },       // KKM
    attachments: [{
      type: { type: String, enum: ['file', 'link'] },
      value: String
    }],

    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  'Assignment',
  assignmentSchema
);