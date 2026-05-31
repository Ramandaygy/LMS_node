const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema(
  {
    academic_year_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true,
    },
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    day: {
      type: String,
      enum: ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'],
      required: true,
    },
    time_slot: {
      type: Number,
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
    generated_type: {
      type: String,
      enum: ['manual', 'ai'],
      default: 'manual',
    },
    generated_by: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  }
);

// Hindari error OverwriteModelError dengan mengecek model yang sudah ada
module.exports = mongoose.models.Schedule || mongoose.model('Schedule', scheduleSchema);