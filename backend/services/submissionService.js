const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const mongoose = require('mongoose');

exports.createSubmission = async (data) => Submission.create(data);
exports.getAllSubmissions = async () => Submission.find().populate('assignment_id', 'title').sort({ createdAt: -1 });
exports.getSubmissionById = async (id) => Submission.findById(id).populate('assignment_id', 'title');
exports.updateSubmission = async (id, data) => Submission.findByIdAndUpdate(id, data, { new: true });
exports.deleteSubmission = async (id) => Submission.findByIdAndDelete(id);

// Siswa submit
exports.submitAssignment = async (assignmentId, studentId, { content, link, filePath }) => {
  const existing = await Submission.findOne({ assignment_id: assignmentId, student_id: studentId });
  if (existing) throw new Error('Already submitted');
  return Submission.create({
    assignment_id: assignmentId,
    student_id: studentId,
    content: content || '',
    link: link || '',
    file: filePath || '',
    submitted_at: new Date()
  });
};

// Guru lihat submission per assignment + enrichment nama siswa
exports.getSubmissionsByAssignment = async (assignmentId) => {
  const submissions = await Submission.find({ assignment_id: assignmentId }).sort({ submitted_at: -1 });
  if (!submissions.length) return [];
  const studentIds = [...new Set(submissions.map(s => s.student_id.toString()))];
  const siswaCollection = mongoose.connection.collection('users_siswa');
  const students = await siswaCollection.find({ _id: { $in: studentIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray();
  const studentMap = Object.fromEntries(students.map(s => [s._id.toString(), { full_name: s.full_name, nis: s.nis }]));
  return submissions.map(sub => ({
    ...sub.toObject(),
    student_name: studentMap[sub.student_id.toString()]?.full_name || 'Tidak diketahui',
    student_nis: studentMap[sub.student_id.toString()]?.nis || '-'
  }));
};

// Guru memberi nilai
exports.gradeSubmission = async (assignmentId, studentId, score, feedback, teacherId) => {
  const submission = await Submission.findOne({ assignment_id: assignmentId, student_id: studentId });
  if (!submission) throw new Error('Submission not found');
  submission.score = score;
  submission.feedback = feedback;
  submission.graded_at = new Date();
  submission.graded_by = teacherId;
  await submission.save();
  return submission;
};