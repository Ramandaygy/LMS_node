const Assignment = require('../models/Assignment');

// ======================================
// CREATE ASSIGNMENT
// ======================================
exports.createAssignment =
  async (data) => {

    return await Assignment.create(
      data
    );
  };

// ======================================
// GET ALL ASSIGNMENTS
// ======================================
exports.getAllAssignments =
  async () => {

    return await Assignment.find()
      .populate(
        'module',
        'title'
      )
      .populate(
        'subject',
        'name'
      )
      .populate(
        'teacher',
        'full_name'
      )
      .populate(
        'class',
        'name'
      )
      .sort({ createdAt: -1 });
  };

// ======================================
// GET ASSIGNMENT BY ID
// ======================================
exports.getAssignmentById =
  async (id) => {

    return await Assignment.findById(id)
      .populate(
        'module',
        'title'
      )
      .populate(
        'subject',
        'name'
      )
      .populate(
        'teacher',
        'full_name'
      )
      .populate(
        'class',
        'name'
      );
  };

// ======================================
// UPDATE ASSIGNMENT
// ======================================
exports.updateAssignment =
  async (id, data) => {

    return await Assignment.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );
  };

// ======================================
// DELETE ASSIGNMENT
// ======================================
exports.deleteAssignment =
  async (id) => {

    return await Assignment.findByIdAndDelete(
      id
    );
  };