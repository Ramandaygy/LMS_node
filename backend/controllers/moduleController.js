const moduleService = require(
  '../services/moduleService'
);

// ======================================
// CREATE MODULE
// ======================================
exports.createModule =
  async (req, res) => {

    try {

      const newModule =
        await moduleService.createModule(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: newModule,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create module',
      });
    }
  };

// ======================================
// GET ALL MODULES
// ======================================
exports.getAllModules =
  async (req, res) => {

    try {

      const modules =
        await moduleService.getAllModules();

      return res.status(200).json({
        success: true,
        data: modules,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch modules',
      });
    }
  };

// ======================================
// GET MODULE BY ID
// ======================================
exports.getModuleById =
  async (req, res) => {

    try {

      const moduleData =
        await moduleService.getModuleById(
          req.params.id
        );

      return res.status(200).json({
        success: true,
        data: moduleData,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch module',
      });
    }
  };

// ======================================
// UPDATE MODULE
// ======================================
exports.updateModule =
  async (req, res) => {

    try {

      const updatedModule =
        await moduleService.updateModule(
          req.params.id,
          req.body
        );

      return res.status(200).json({
        success: true,
        data: updatedModule,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to update module',
      });
    }
  };

// ======================================
// DELETE MODULE
// ======================================
exports.deleteModule =
  async (req, res) => {

    try {

      await moduleService.deleteModule(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message:
          'Module deleted successfully',
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to delete module',
      });
    }
  };