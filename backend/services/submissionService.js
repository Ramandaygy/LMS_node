const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const mongoose = require('mongoose');

exports.createSubmission = async (data) => Submission.create(data);
exports.getAllSubmissions = async () => Submission.find().populate('assignment_id', 'title').sort({ createdAt: -1 });
exports.getSubmissionById = async (id) => Submission.findById(id).populate('assignment_id', 'title');
exports.updateSubmission = async (id, data) => Submission.findByIdAndUpdate(id, data, { new: true });
exports.deleteSubmission = async (id) => Submission.findByIdAndDelete(id);

// Siswa submit
exports.submitAssignment = async (assignmentId, studentId, { content, link, filePath, answers }) => {
  const existing = await Submission.findOne({ assignment_id: assignmentId, student_id: studentId });
  if (existing) throw new Error('Already submitted');

  let processedAnswers = [];
  let pilganScore = 0;
  let finalScore = null;
  
  if (answers) {
    const assignment = await Assignment.findById(assignmentId);
    if (assignment && assignment.assignment_type === 'structured') {
      let totalPilganScore = 0;
      let obtainedPilganScore = 0;
      let hasEssay = false;
      
      assignment.questions.forEach((q, idx) => {
        const studentAnswer = answers[idx] || '';
        const isCorrect = q.question_type === 'pilgan' && studentAnswer === q.correct_answer;
        const pointsEarned = isCorrect ? (q.points || 10) : 0;
        
        if (q.question_type === 'pilgan') {
          totalPilganScore += (q.points || 10);
          obtainedPilganScore += pointsEarned;
        } else if (q.question_type === 'essay') {
          hasEssay = true;
        }

        processedAnswers.push({
          question_id: q._id, // Will be undefined if not generated, but that's fine
          answer_text: studentAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      });
      
      if (totalPilganScore > 0) {
        // Calculate percentage for pilgan score (scale 0-100) or just sum the raw points?
        // Usually, the raw points are the score. So let's just use obtainedPilganScore
        pilganScore = obtainedPilganScore;
      }
      
      // If there are no essay questions, the submission is fully auto-gradable
      if (!hasEssay) {
        finalScore = pilganScore;
      }
    }
  }

  return Submission.create({
    assignment_id: assignmentId,
    student_id: studentId,
    content: content || '',
    link: link || '',
    file: filePath || '',
    answers: processedAnswers,
    pilgan_score: pilganScore,
    score: finalScore,
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

// Guru memberi nilai (upsert jika siswa belum ada record submisi)
exports.gradeSubmission = async (assignmentId, studentId, score, feedback, teacherId) => {
  let submission = await Submission.findOne({ assignment_id: assignmentId, student_id: studentId });
  if (!submission) {
    submission = new Submission({
      assignment_id: assignmentId,
      student_id: studentId,
      content: '',
      link: '',
      file: '',
      submitted_at: null
    });
  }
  submission.score = score !== null && score !== '' && score !== undefined ? Number(score) : null;
  submission.feedback = feedback || '';
  submission.graded_at = new Date();
  submission.graded_by = teacherId;
  await submission.save();
  return submission;
};