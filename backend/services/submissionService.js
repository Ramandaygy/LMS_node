const Submission = require(
  '../models/Submission'
);

// ======================================
// CREATE SUBMISSION
// ======================================
exports.createSubmission =
  async (data) => {

    return await Submission.create(
      data
    );
  };

// ======================================
// GET ALL SUBMISSIONS
// ======================================
exports.getAllSubmissions =
  async () => {

    return await Submission.find()
      .populate(
        'assignment',
        'title'
      )
      .populate(
        'student',
        'full_name email'
      )
      .sort({ createdAt: -1 });
  };

// ======================================
// GET SUBMISSION BY ID
// ======================================
exports.getSubmissionById =
  async (id) => {

    return await Submission.findById(id)
      .populate(
        'assignment',
        'title'
      )
      .populate(
        'student',
        'full_name email'
      );
  };