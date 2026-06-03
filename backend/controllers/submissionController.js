const submissionService = require(
  '../services/submissionService'
);

// ======================================
// CREATE SUBMISSION
// ======================================
exports.createSubmission =
  async (req, res) => {

    try {

      const submission =
        await submissionService.createSubmission(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: submission,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create submission',
      });
    }
  };

// ======================================
// GET ALL SUBMISSIONS
// ======================================
exports.getAllSubmissions =
  async (req, res) => {

    try {

      const submissions =
        await submissionService.getAllSubmissions();

      return res.status(200).json({
        success: true,
        data: submissions,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch submissions',
      });
    }
  };

// ======================================
// GET SUBMISSION BY ID
// ======================================
exports.getSubmissionById =
  async (req, res) => {

    try {

      const submission =
        await submissionService.getSubmissionById(
          req.params.id
        );

      return res.status(200).json({
        success: true,
        data: submission,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch submission',
      });
    }
  };

// ======================================
// UPDATE SUBMISSION
// ======================================
exports.updateSubmission =
  async (req, res) => {

    try {

      const submission =
        await submissionService.updateSubmission(
          req.params.id,
          req.body
        );

      return res.status(200).json({
        success: true,
        data: submission,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to update submission',
      });
    }
  };

// ======================================
// DELETE SUBMISSION
// ======================================
exports.deleteSubmission =
  async (req, res) => {

    try {

      await submissionService.deleteSubmission(
        req.params.id
      );

      return res.status(200).json({
        success: true,
        message:
          'Submission deleted successfully',
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to delete submission',
      });
    }
  };

  exports.submitAssignment = async (req, res) => {
    try {
      const { assignment_id, content, link } = req.body;
      const studentId = req.user.id;
      let filePath = '';
      if (req.file) filePath = `/uploads/submissions/${req.file.filename}`;
      const existing = await Submission.findOne({ assignment_id, student_id: studentId });
      if (existing) return res.status(400).json({ error: 'Already submitted' });
      const submission = await Submission.create({
        assignment_id,
        student_id: studentId,
        content: content || '',
        link: link || '',
        file: filePath,
      });
      res.json({ success: true, data: submission });
    } catch(err) { res.status(500).json({ error: err.message }); }
  };

  exports.submitAssignment = async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const studentId = req.user.id;
      const { content, link } = req.body;
      let filePath = '';
      if (req.file) filePath = `/uploads/submissions/${req.file.filename}`;
      const submission = await submissionService.submitAssignment(assignmentId, studentId, { content, link, filePath });
      res.json({ success: true, data: submission });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };
  
  exports.getAssignmentSubmissions = async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const submissions = await submissionService.getSubmissionsByAssignment(assignmentId);
      res.json({ success: true, data: submissions });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };
  
  exports.gradeSubmission = async (req, res) => {
    try {
      const { assignmentId } = req.params;
      const { student_id, score, feedback } = req.body;
      const teacherId = req.user.id;
      const submission = await submissionService.gradeSubmission(assignmentId, student_id, score, feedback, teacherId);
      res.json({ success: true, data: submission });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  };