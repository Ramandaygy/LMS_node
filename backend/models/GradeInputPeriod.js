const mongoose = require('mongoose');

const gradeInputPeriodSchema = new mongoose.Schema(
  {
    academic_year_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: true,
    },

    type: {
      type: String,
      enum: ['tugas', 'uts', 'uas', 'ulangan'],
      required: true,
    },

    label: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: '',
    },

    start_date: {
      type: Date,
      required: true,
    },

    end_date: {
      type: Date,
      required: true,
    },

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'grade_input_periods',
  }
);

gradeInputPeriodSchema.index({ academic_year_id: 1, type: 1 });

// Virtual: cek apakah periode sedang aktif (dibuka) berdasarkan tanggal
gradeInputPeriodSchema.virtual('is_open').get(function () {
  const now = new Date();
  const start = new Date(this.start_date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(this.end_date);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
});

gradeInputPeriodSchema.set('toJSON', { virtuals: true });
gradeInputPeriodSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GradeInputPeriod', gradeInputPeriodSchema);
