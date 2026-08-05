const mongoose = require('mongoose');

const raporSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    class_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      required: true
    },
    academic_year_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicYear',
      required: false
    },
    semester: {
      type: String,
      default: 'Genap'
    },
    extracurriculars: [
      {
        name: { type: String, default: '' },
        grade: { type: String, default: '' },
        note: { type: String, default: '' }
      }
    ],
    attendance: {
      sick: { type: Number, default: 0 },
      permit: { type: Number, default: 0 },
      absent: { type: Number, default: 0 }
    },
    note: {
      type: String,
      default: ''
    },
    physical_condition: {
      height: { type: Number, default: 0 },
      weight: { type: Number, default: 0 }
    },
    school_name: {
      type: String,
      default: ''
    },
    school_address: {
      type: String,
      default: ''
    },
    headmaster_name: {
      type: String,
      default: ''
    },
    headmaster_nip: {
      type: String,
      default: ''
    },
    teacher_name: {
      type: String,
      default: ''
    },
    teacher_nip: {
      type: String,
      default: ''
    },
    place_date: {
      type: String,
      default: ''
    },
    kokurikuler_note: {
      type: String,
      default: ''
    },
    parent_feedback: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Rapor', raporSchema);
