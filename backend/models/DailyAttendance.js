const mongoose = require('mongoose');

const dailyAttendanceSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User'
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    bk_teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'permit', 'sick'],
      default: 'present'
    },
    note: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('DailyAttendance', dailyAttendanceSchema);
