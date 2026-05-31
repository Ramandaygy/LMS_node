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
        .sort({
          created_at: -1
        });

    const teachers =
      await guruCollection
        .find({})
        .toArray();

    const academicYears =
      await academicYearCollection
        .find({})
        .toArray();

    return classes.map(cls => {

      const teacher =
        teachers.find(
          teacher =>
            teacher._id.toString() ===
            cls.homeroom_teacher?.toString()
        );

      const academicYear =
        academicYears.find(
          year =>
            year._id.toString() ===
            cls.academic_year_id?.toString()
        );

      return {

        ...cls.toObject(),

        homeroom_teacher_name:
          teacher?.full_name || '-',

        academic_year_name:
          academicYear
            ? `${academicYear.year}${academicYear.semester ? ` - ${academicYear.semester}` : ''}`
            : '-',

        academic_year:
          academicYear || null,

        is_active:
          cls.is_active ?? true
      };
    });
  };

// ======================================
// GET CLASS BY ID
// ======================================

exports.getClassById =
  async (id) => {

    const cls =
      await Class.findById(id);

    if (!cls) {
      return null;
    }

    const teacher =
      await guruCollection.findOne({
        _id: cls.homeroom_teacher
      });

    const academicYear =
      await academicYearCollection.findOne({
        _id: cls.academic_year_id
      });

    return {
      ...cls.toObject(),

      homeroom_teacher_name:
        teacher?.full_name || '-',

      academic_year_name:
        academicYear
          ? `${academicYear.year}${academicYear.semester ? ` - ${academicYear.semester}` : ''}`
          : '-',

      academic_year:
        academicYear || null
    };
  };

// ======================================
// UPDATE CLASS
// ======================================

exports.updateClass =
  async (
    id,
    data
  ) => {

    return await Class.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
      }
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