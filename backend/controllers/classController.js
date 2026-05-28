const classService = require(
  '../services/classService'
);

// ======================================
// CREATE CLASS
// ======================================
exports.createClass =
  async (req, res) => {

    try {

      const newClass =
        await classService.createClass(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: newClass,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create class',
      });
    }
  };

// ======================================
// GET ALL CLASSES
// ======================================
exports.getAllClasses =
  async (req, res) => {

    try {

      const classes =
        await classService.getAllClasses();

      return res.status(200).json({
        success: true,
        data: classes,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch classes',
      });
    }
  };

// ======================================
// GET CLASS BY ID
// ======================================
exports.getClassById =
  async (req, res) => {

    try {

      const classData =
        await classService.getClassById(
          req.params.id
        );

      if (!classData) {

        return res.status(404).json({
          success: false,
          message:
            'Class not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: classData,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch class',
      });
    }
  };

// ======================================
// UPDATE CLASS
// ======================================
exports.updateClass =
  async (req, res) => {

    try {

      const updatedClass =
        await classService.updateClass(
          req.params.id,
          req.body
        );

      return res.status(200).json({
        success: true,
        data: updatedClass,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to update class',
      });
    }
  };

// ======================================
// DELETE CLASS
// ======================================
exports.deleteClass =
  async (req, res) => {

    try {

      await classService.deleteClass(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message:
          'Class deleted successfully',
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to delete class',
      });
    }
  };