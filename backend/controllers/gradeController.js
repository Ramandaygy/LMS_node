const gradeService = require(
  '../services/gradeService'
);

// ======================================
// CREATE GRADE
// ======================================
exports.createGrade =
  async (req, res) => {

    try {

      const grade =
        await gradeService.createGrade(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: grade,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create grade',
      });
    }
  };

// ======================================
// GET ALL GRADES
// ======================================
exports.getAllGrades =
  async (req, res) => {

    try {

      const grades =
        await gradeService.getAllGrades();

      return res.status(200).json({
        success: true,
        data: grades,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch grades',
      });
    }
  };