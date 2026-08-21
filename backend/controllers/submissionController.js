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
      const { assignmentId } = req.params;
      const studentId = req.user.id;
      const { content, link, answers } = req.body;
      let parsedAnswers = null;
      if (answers) {
        try {
          parsedAnswers = JSON.parse(answers);
        } catch(e) { console.error('Failed to parse answers', e); }
      }
      let filePath = '';

      if (req.file) {
        try {
          if (process.env.VERCEL === '1' && req.file.buffer) {
            const { uploadToSupabase } = require('../services/supabaseService');
            filePath = await uploadToSupabase(req.file.buffer, req.file.originalname, req.file.mimetype, 'submissions');
          } else {
            filePath = `/uploads/submissions/${req.file.filename}`;
          }
        } catch (uploadErr) {
          console.warn('[UploadToSupabase submission fallback]:', uploadErr.message);
          if (req.file.buffer) {
            const base64Str = req.file.buffer.toString('base64');
            filePath = `data:${req.file.mimetype};base64,${base64Str}`;
          } else {
            filePath = `/uploads/submissions/${req.file.filename || req.file.originalname}`;
          }
        }
      }

      const submission = await submissionService.submitAssignment(assignmentId, studentId, { content, link, filePath, answers: parsedAnswers });
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
      const teacherId = req.user.id;

      let gradesList = [];
      if (Array.isArray(req.body.grades)) {
        gradesList = req.body.grades;
      } else if (req.body.student_id) {
        gradesList = [{
          student_id: req.body.student_id,
          score: req.body.score,
          feedback: req.body.feedback
        }];
      }

      if (gradesList.length === 0) {
        return res.status(400).json({ success: false, message: 'Tidak ada data nilai yang dikirim' });
      }

      const results = [];
      for (const item of gradesList) {
        if (!item.student_id) continue;
        const submission = await submissionService.gradeSubmission(
          assignmentId,
          item.student_id,
          item.score,
          item.feedback,
          teacherId
        );
        results.push(submission);

        // Send push notification for graded submission
        try {
          const notificationController = require('./notificationController');
          const siswaCol = mongoose.connection.collection('users_siswa');
          const student = await siswaCol.findOne({ _id: new mongoose.Types.ObjectId(item.student_id) });
          
          if (student && item.score !== null && item.score !== undefined) {
            const AssignmentModel = require('../models/Assignment');
            const assignment = await AssignmentModel.findById(assignmentId);
            const assignmentTitle = assignment?.title || 'Tugas';

            notificationController.sendPushNotification(
              item.student_id.toString(),
              'Tugas Selesai Dinilai!',
              `Tugas "${assignmentTitle}" Anda telah dinilai. Nilai: ${item.score}.`,
              '/dashboard/siswa/assignments'
            ).catch(e => console.error(e));

            if (student.parent_id) {
              notificationController.sendPushNotification(
                student.parent_id.toString(),
                'Nilai Tugas Anak Anda',
                `Tugas "${assignmentTitle}" untuk ${student.full_name} telah dinilai dengan nilai: ${item.score}.`,
                '/dashboard/ortu'
              ).catch(e => console.error(e));
            }
          }
        } catch (notifErr) {
          console.error('Failed to send assignment graded push notifications:', notifErr);
        }

        // EWS check
        try {
          const progressService = require('../services/progressService');
          progressService.checkAndNotifyEWS(item.student_id.toString()).catch(e => console.error('[EWS Trigger Err]:', e));
        } catch (ewsErr) {
          console.error('Failed to trigger EWS check:', ewsErr);
        }
      }

      return res.json({ success: true, data: results });
    } catch (err) {
      console.error('[GradeSubmission Controller Err]:', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  };