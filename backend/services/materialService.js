const Material = require('../models/Material');

// ======================================
// CREATE MATERIAL
// ======================================
exports.createMaterial =
  async (data) => {

    return await Material.create(
      data
    );
  };

// ======================================
// GET ALL MATERIALS
// ======================================
exports.getAllMaterials =
  async () => {

    return await Material.find()
      .populate(
        'module',
        'title'
      )
      .populate(
        'uploaded_by',
        'full_name'
      )
      .sort({ order: 1 });
  };

// ======================================
// GET MATERIAL BY ID
// ======================================
exports.getMaterialById =
  async (id) => {

    return await Material.findById(id)
      .populate(
        'module',
        'title'
      )
      .populate(
        'uploaded_by',
        'full_name'
      );
  };

// ======================================
// UPDATE MATERIAL
// ======================================
exports.updateMaterial =
  async (id, data) => {

    return await Material.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );
  };

// ======================================
// DELETE MATERIAL
// ======================================
exports.deleteMaterial =
  async (id) => {

    return await Material.findByIdAndDelete(
      id
    );
  };

  exports.getMaterialsByModule =
  async (moduleId) => {
  
    return await Material.find()
    .populate(
      'class_id',
      'name'
    )
    .populate(
      'subject_id',
      'name code'
    )
    .populate(
      'module',
      'title'
    )
    .populate(
      'uploaded_by',
      'full_name'
    );
  };

  exports.generateMaterialAI =
  async (data) => {
  
    const material =
    await Material.create({
  
      module:
        data.module,
  
      title:
        data.title,
  
      description:
        data.description,
  
      content:
        data.content,
  
      source_type:
        'ai',
  
      ai_prompt:
        data.prompt,
  
      uploaded_by:
        data.uploaded_by
    });
  
    return material;
  };