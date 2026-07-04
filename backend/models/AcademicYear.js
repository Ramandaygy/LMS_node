const mongoose = require('mongoose');

const academicYearSchema =
  new mongoose.Schema(
    {
      year: {
        type: String,
        required: true,
      },

      semester: {
        type: String,
        enum: ['Ganjil', 'Genap'],
        default: 'Ganjil',
      },

      start_date: {
        type: Date,
      },

      end_date: {
        type: Date,
      },

      is_active: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },

      collection: 'academic_years'
    }
  );

academicYearSchema.index({ year: 1, semester: 1 }, { unique: true });

module.exports =
  mongoose.model(
    'AcademicYear',
    academicYearSchema
  );