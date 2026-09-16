const mongoose = require('mongoose');

const gradeInputAccessSchema = new mongoose.Schema(
  {
    period_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GradeInputPeriod',
      required: true,
    },

    teacher_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },

    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
    },

    access_until: {
      type: Date,
      required: true,
    },

    reason: {
      type: String,
      default: '',
    },

    granted_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    collection: 'grade_input_access',
  }
);

gradeInputAccessSchema.index({ period_id: 1, teacher_id: 1 });

// Virtual: cek apakah akses ini masih aktif
gradeInputAccessSchema.virtual('is_active').get(function () {
  const now = new Date();
  const until = new Date(this.access_until);
  until.setHours(23, 59, 59, 999);
  return now <= until;
});

gradeInputAccessSchema.set('toJSON', { virtuals: true });
gradeInputAccessSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('GradeInputAccess', gradeInputAccessSchema);
