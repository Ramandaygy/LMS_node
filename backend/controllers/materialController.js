const materialService = require(
  '../services/materialService'
);

// ======================================
// CREATE MATERIAL
// ======================================
exports.createMaterial =
  async (req, res) => {

    try {

      const newMaterial =
        await materialService.createMaterial(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: newMaterial,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create material',
      });
    }
  };

// ======================================
// GET ALL MATERIALS
// ======================================
exports.getAllMaterials =
  async (req, res) => {

    try {

      const materials =
        await materialService.getAllMaterials();

      return res.status(200).json({
        success: true,
        data: materials,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch materials',
      });
    }
  };