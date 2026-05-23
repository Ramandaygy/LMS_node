const Assignment = require('../../models/Assignment');
const Submission = require('../../models/Submission');
const UserSiswa = require('../../models/UserSiswa');
const Class = require('../../models/Class');
const Subject = require('../../models/Subject');
const { saveSubmissionFile, UPLOAD_FOLDER } = require('../../utils/submissionUpload');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongoose').Types;
const jwt = require('jsonwebtoken');

// GET /assignments
exports.getMyAssignments = async (req, res) => {
  try {
    const studentId = req.user.id;
    const student = await UserSiswa.findById(studentId).lean();
    if (!student) return res.status(404).json({ error: 'Siswa tidak ditemukan' });

    let classId = null;
    if (student.class_id) {
      classId = student.class_id;
    } else {
      // fallback: cari kelas berdasarkan nama (jika pakai field 'class')
      if (student.class) {
        const classDoc = await Class.findOne({ name: student.class }).lean();
        if (classDoc) classId = classDoc._id;
      }
    }
    if (!classId) {
      return res.status(400).json({ error: 'Siswa belum memiliki kelas' });
    }

    // Ambil assignments berdasarkan class_id
    const assignments = await Assignment.find({ class_id: classId })
      .sort({ created_at: -1 })
      .lean();

    // Pre-fetch subjects
    const subjectIds = assignments.map(a => a.subject_id).filter(id => id);
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s.name]));

    // Ambil semua submissions untuk student ini
    const assignmentIds = assignments.map(a => a._id);
    const submissions = await Submission.find({
      assignment_id: { $in: assignmentIds },
      student_id: studentId
    }).lean();
    const submissionMap = new Map();
    submissions.forEach(sub => submissionMap.set(sub.assignment_id.toString(), sub));

    const result = assignments.map(a => {
      const sub = submissionMap.get(a._id.toString());
      return {
        ...a,
        _id: a._id.toString(),
        class_id: a.class_id?.toString(),
        subject_id: a.subject_id?.toString(),
        teacher_id: a.teacher_id?.toString(),
        deadline: a.deadline ? a.deadline.toISOString() : null,
        created_at: a.created_at ? a.created_at.toISOString() : null,
        subject_name: subjectMap.get(a.subject_id?.toString()) || 'Unknown',
        submitted: !!sub,
        submitted_at: sub?.submitted_at ? sub.submitted_at.toISOString() : null,
        score: sub?.score || null,
        feedback: sub?.feedback || null
      };
    });
    res.json({ assignments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /assignments/:assignment_id/submit
exports.submitAssignment = async (req, res) => {
  try {
    const studentId = req.user.id;
    const assignmentId = req.params.assignment_id;

    const assignment = await Assignment.findById(assignmentId).lean();
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan' });

    // Cek sudah submit
    const existing = await Submission.findOne({ assignment_id: assignmentId, student_id: studentId });
    if (existing) return res.status(400).json({ error: 'Anda sudah mengumpulkan tugas ini' });

    // Cek deadline
    const deadline = assignment.deadline;
    if (deadline && new Date() > new Date(deadline)) {
      return res.status(400).json({ error: 'Melewati batas waktu pengumpulan' });
    }

    // Upload file (field name 'file')
    const file = req.file;
    const fileInfo = file ? saveSubmissionFile(file) : null;
    const content = req.body.content || '';

    const newSubmission = new Submission({
      assignment_id: assignmentId,
      student_id: studentId,
      class_id: assignment.class_id,
      subject_id: assignment.subject_id,
      teacher_id: assignment.teacher_id,
      content,
      file: fileInfo,
      submitted_at: new Date(),
      status: 'submitted',
      score: null,
      feedback: null,
      graded_at: null
    });
    await newSubmission.save();
    res.status(201).json({ message: 'Tugas berhasil dikumpulkan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /uploads/assignments/:filename (dengan token di query)
exports.serveAssignmentFile = async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).json({ error: 'Token required' });
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (decoded.user.role !== 'siswa') {
      return res.status(403).json({ error: 'Access forbidden' });
    }

    const filename = req.params.filename;
    const filePath = path.join(UPLOAD_FOLDER, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.sendFile(path.resolve(filePath));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};