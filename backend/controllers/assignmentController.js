const assignmentService = require(
  '../services/assignmentService'
);

// ======================================
// CREATE ASSIGNMENT
// ======================================
exports.createAssignment =
  async (req, res) => {

    try {

      const newAssignment =
        await assignmentService.createAssignment(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: newAssignment,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create assignment',
      });
    }
  };

// ======================================
// GET ALL ASSIGNMENTS
// ======================================
exports.getAllAssignments =
  async (req, res) => {

    try {

      const assignments =
        await assignmentService.getAllAssignments();

      return res.status(200).json({
        success: true,
        data: assignments,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch assignments',
      });
    }
  };