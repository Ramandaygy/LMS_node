const Class = require('../models/Class');

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

    return await Class.find()
      .populate(
        'homeroom_teacher',
        'full_name email'
      )
      .sort({ createdAt: -1 });
  };

// ======================================
// GET CLASS BY ID
// ======================================
exports.getClassById =
  async (id) => {

    return await Class.findById(id)
      .populate(
        'homeroom_teacher',
        'full_name email'
      );
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