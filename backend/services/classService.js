const mongoose = require('mongoose');
const Class = require('../models/Class');

// ======================================
// COLLECTIONS
// ======================================

const guruCollection =
  mongoose.connection.collection(
    'users_guru'
  );

const academicYearCollection =
  mongoose.connection.collection(
    'academic_years'
  );

// ======================================
// CREATE CLASS
// ======================================

exports.createClass = async (
  data
) => {

  const newClass =
    await Class.create(data);

  return newClass;
};

// ======================================
// GET ALL CLASSES
// ======================================

exports.getAllClasses =
  async () => {

    const classes =
      await Class.find()
        .sort({ createdAt: -1 });

    // =========================
    // AMBIL MASTER DATA
    // =========================

    const teachers =
      await guruCollection
        .find({})
        .toArray();

    const academicYears =
      await academicYearCollection
        .find({})
        .toArray();

    // =========================
    // MAP DATA
    // =========================

    return classes.map(cls => {

      // =====================
      // WALI KELAS
      // =====================

      const teacher =
        teachers.find(
          t =>
            t._id.toString() ===
            cls.homeroom_teacher?.toString()
        );

      // =====================
      // TAHUN AJARAN
      // =====================

      const academicYear =
        academicYears.find(
          a =>
            a._id.toString() ===
            cls.academic_year_id?.toString()
        );

      return {

        ...cls.toObject(),

        homeroom_teacher_name:
          teacher?.full_name || '-',

        academic_year_name:
          academicYear?.name || '-',

        is_active:
          cls.is_active !== undefined
            ? cls.is_active
            : true,
      };
    });
  };

// ======================================
// GET CLASS BY ID
// ======================================

exports.getClassById =
  async (id) => {

    return await Class.findById(id);
  };

// ======================================
// UPDATE CLASS
// ======================================

exports.updateClass =
  async (id, data) => {

    return await Class.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );
  };

// ======================================
// DELETE CLASS
// ======================================

exports.deleteClass =
  async (id) => {

    return await Class.findByIdAndDelete(
      id
    );
  };