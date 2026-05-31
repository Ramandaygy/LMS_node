const mongoose = require('mongoose');

const academicYearSchema =
  new mongoose.Schema(
    {
      year: {
        type: String,
        required: true,
        unique: true,
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

module.exports =
  mongoose.model(
    'AcademicYear',
    academicYearSchema
  );