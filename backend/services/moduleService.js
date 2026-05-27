const Module = require('../models/Module');

// ======================================
// CREATE MODULE
// ======================================
exports.createModule =
  async (data) => {

    return await Module.create(
      data
    );
  };

// ======================================
// GET ALL MODULES
// ======================================
exports.getAllModules =
  async () => {

    return await Module.find()
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
// GET MODULE BY ID
// ======================================
exports.getModuleById =
  async (id) => {

    return await Module.findById(id)
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
// UPDATE MODULE
// ======================================
exports.updateModule =
  async (id, data) => {

    return await Module.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );
  };

// ======================================
// DELETE MODULE
// ======================================
exports.deleteModule =
  async (id) => {

    return await Module.findByIdAndDelete(
      id
    );
  };