const subjectService = require(
  '../services/subjectService'
);

// ======================================
// CREATE SUBJECT
// ======================================
exports.createSubject =
  async (req, res) => {

    try {

      const newSubject =
        await subjectService.createSubject(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: newSubject,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create subject',
      });
    }
  };

// ======================================
// GET ALL SUBJECTS
// ======================================
exports.getAllSubjects =
  async (req, res) => {

    try {

      const subjects =
        await subjectService.getAllSubjects();

      return res.status(200).json({
        success: true,
        data: subjects,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch subjects',
      });
    }
  };

// ======================================
// GET SUBJECT BY ID
// ======================================
exports.getSubjectById =
  async (req, res) => {

    try {

      const subject =
        await subjectService.getSubjectById(
          req.params.id
        );

      return res.status(200).json({
        success: true,
        data: subject,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch subject',
      });
    }
  };

// ======================================
// UPDATE SUBJECT
// ======================================
exports.updateSubject =
  async (req, res) => {

    try {

      const updatedSubject =
        await subjectService.updateSubject(
          req.params.id,
          req.body
        );

      return res.status(200).json({
        success: true,
        data: updatedSubject,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to update subject',
      });
    }
  };

// ======================================
// DELETE SUBJECT
// ======================================
exports.deleteSubject =
  async (req, res) => {

    try {

      await subjectService.deleteSubject(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message:
          'Subject deleted successfully',
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to delete subject',
      });
    }
  };