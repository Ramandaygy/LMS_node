const Subject = require('../models/Subject');

// ======================================
// CREATE SUBJECT
// ======================================
exports.createSubject =
  async (data) => {

    return await Subject.create(
      data
    );
  };

// ======================================
// GET ALL SUBJECTS
// ======================================
exports.getAllSubjects =
  async () => {

    return await Subject.find()
      .populate(
        'teacher',
        'full_name email'
      )
      .sort({ createdAt: -1 });
  };

// ======================================
// GET SUBJECT BY ID
// ======================================
exports.getSubjectById =
  async (id) => {

    return await Subject.findById(id)
      .populate(
        'teacher',
        'full_name email'
      );
  };

// ======================================
// UPDATE SUBJECT
// ======================================
exports.updateSubject =
  async (id, data) => {

    return await Subject.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );
  };

// ======================================
// DELETE SUBJECT
// ======================================
exports.deleteSubject =
  async (id) => {

    return await Subject.findByIdAndDelete(
      id
    );
  };