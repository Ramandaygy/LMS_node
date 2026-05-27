const Grade = require(
  '../models/Grade'
);

// ======================================
// CREATE GRADE
// ======================================
exports.createGrade =
  async (data) => {

    return await Grade.create(
      data
    );
  };

// ======================================
// GET ALL GRADES
// ======================================
exports.getAllGrades =
  async () => {

    return await Grade.find()
      .populate(
        'student',
        'full_name'
      )
      .populate(
        'teacher',
        'full_name'
      )
      .populate(
        'subject',
        'name'
      )
      .populate(
        'assignment',
        'title'
      )
      .sort({ createdAt: -1 });
  };