const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },

    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    day: {
      type: String,
      required: true,
    },

    start_time: {
      type: String,
      required: true,
    },

    end_time: {
      type: String,
      required: true,
    },

    room: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'Schedule',
  scheduleSchema
);