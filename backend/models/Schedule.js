const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  class_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UserGuru', required: true },
  day: { type: String, required: true },
  start_time: { type: String, required: true },
  end_time: { type: String, required: true },
  room: String,
  academic_year_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Schedule', ScheduleSchema, 'schedules');