const mongoose = require('mongoose');

const attendanceSchema =
  new mongoose.Schema(
    {
      student: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },

      class: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'Class',
      },

      subject: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
      },

      status: {
        type: String,
        enum: [
          'hadir',
          'izin',
          'sakit',
          'alpha',
        ],
        default: 'hadir',
      },

      date: {
        type: Date,
        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

module.exports = mongoose.model(
  'Attendance',
  attendanceSchema
);