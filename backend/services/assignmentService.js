const Assignment = require('../models/Assignment');
const mongoose = require('mongoose');

// CREATE
exports.createAssignment = async (data) => {
  return await Assignment.create(data);
};

// GET ALL dengan enrichment nama guru, kelas, mapel
exports.getAllAssignments = async () => {
  const assignments = await Assignment.find().sort({ createdAt: -1 });
  return await enrichAssignments(assignments);
};

// GET BY ID
exports.getAssignmentById = async (id) => {
  const assignment = await Assignment.findById(id);
  if (!assignment) return null;
  const enriched = await enrichAssignments([assignment]);
  return enriched[0];
};

// UPDATE
exports.updateAssignment = async (id, data) => {
  return await Assignment.findByIdAndUpdate(id, data, { new: true });
};

// DELETE
exports.deleteAssignment = async (id) => {
  return await Assignment.findByIdAndDelete(id);
};

// UNTUK GURU
exports.getAssignmentsByTeacher = async (teacherId) => {
  const assignments = await Assignment.find({ teacher: teacherId }).sort({ createdAt: -1 });
  return await enrichAssignments(assignments);
};

// UNTUK SISWA
exports.getAssignmentsForStudent = async (classId, studentId) => {
  // 1. Ambil semua assignment untuk kelas ini
  let classIdStr = classId.toString();
  let classIdObj;
  try {
    classIdObj = new mongoose.Types.ObjectId(classIdStr);
  } catch (e) {
    classIdObj = classId;
  }

  const assignments = await Assignment.find({
    $or: [
      { class: classIdStr },
      { class: classIdObj },
      { class_id: classIdStr },
      { class_id: classIdObj }
    ],
    is_active: true
  }).sort({ deadline: 1 });
  if (!assignments.length) return [];

  // 2. Ambil semua submission siswa untuk assignment ini
  const submissionCollection = mongoose.connection.collection('submissions');
  const submissions = await submissionCollection.find({
    student_id: new mongoose.Types.ObjectId(studentId),
    assignment_id: { $in: assignments.map(a => a._id) }
  }).toArray();

  // 3. Buat map submission per assignment_id
  const submissionMap = new Map();
  submissions.forEach(sub => {
    submissionMap.set(sub.assignment_id.toString(), {
      submitted: true,
      score: sub.score,
      feedback: sub.feedback,
      submitted_at: sub.submitted_at,
      file: sub.file,
      link: sub.link,
      content: sub.content
    });
  });

  // 4. Enrich assignment dengan informasi submission
  const enriched = await enrichAssignments(assignments);
  return enriched.map(a => ({
    ...a,
    submitted: submissionMap.has(a._id.toString()),
    score: submissionMap.get(a._id.toString())?.score ?? null,
    feedback: submissionMap.get(a._id.toString())?.feedback ?? null,
    submitted_at: submissionMap.get(a._id.toString())?.submitted_at ?? null,
    submission_file: submissionMap.get(a._id.toString())?.file ?? null,
    submission_link: submissionMap.get(a._id.toString())?.link ?? null,
    submission_content: submissionMap.get(a._id.toString())?.content ?? null
  }));
};

// ENRICHMENT (ambil nama dari koleksi terpisah) - tanpa modul
async function enrichAssignments(assignments) {
  if (!assignments.length) return [];

  const teacherIds = [...new Set(assignments.map(a => a.teacher?.toString()).filter(Boolean))];
  const classIds = [...new Set(assignments.map(a => (a.class || a.class_id)?.toString()).filter(Boolean))];
  const subjectIds = [...new Set(assignments.map(a => (a.subject || a.subject_id)?.toString()).filter(Boolean))];

  const guruCollection = mongoose.connection.collection('users_guru');
  const classCollection = mongoose.connection.collection('classes');
  const subjectCollection = mongoose.connection.collection('subjects');

  const teachers = teacherIds.length ? await guruCollection.find({ _id: { $in: teacherIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];
  const classes = classIds.length ? await classCollection.find({ _id: { $in: classIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];
  const subjects = subjectIds.length ? await subjectCollection.find({ _id: { $in: subjectIds.map(id => new mongoose.Types.ObjectId(id)) } }).toArray() : [];

  const teacherMap = Object.fromEntries(teachers.map(t => [t._id.toString(), t.full_name]));
  const classMap = Object.fromEntries(classes.map(c => [c._id.toString(), c.name]));
  const subjectMap = Object.fromEntries(subjects.map(s => [s._id.toString(), s.name]));

  return assignments.map(a => ({
    ...a.toObject(),
    teacher_name: teacherMap[a.teacher?.toString()] || 'Tidak diketahui',
    class_name: classMap[(a.class || a.class_id)?.toString()] || 'Tidak diketahui',
    subject_name: subjectMap[(a.subject || a.subject_id)?.toString()] || 'Tidak diketahui',
  }));
}