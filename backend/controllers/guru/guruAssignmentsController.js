const Assignment = require('../../models/Assignment');
const Class = require('../../models/Class');
const Subject = require('../../models/Subject');
const UserGuru = require('../../models/UserGuru');
const UserSiswa = require('../../models/UserSiswa');
const Submission = require('../../models/Submission');
const { saveUploadedFiles, UPLOAD_FOLDER } = require('../../utils/fileUpload');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongoose').Types;

// GET /assignments
exports.getAssignments = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignments = await Assignment.find({ teacher_id: teacherId })
      .sort({ created_at: -1 })
      .lean();

    // Pre-fetch class, subject, dan statistik
    const classIds = assignments.map(a => a.class_id).filter(id => id);
    const subjectIds = assignments.map(a => a.subject_id).filter(id => id);
    const classes = await Class.find({ _id: { $in: classIds } }).lean();
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();

    const classMap = new Map(classes.map(c => [c._id.toString(), c]));
    const subjectMap = new Map(subjects.map(s => [s._id.toString(), s]));

    // Hitung jumlah siswa per kelas (cached)
    const classStudentCount = new Map();
    for (let cls of classes) {
      const count = await UserSiswa.countDocuments({ class_id: cls._id, role: 'siswa', status: 'active' });
      classStudentCount.set(cls._id.toString(), count);
    }

    const result = [];
    for (let a of assignments) {
      const classDoc = classMap.get(a.class_id?.toString());
      const subjectDoc = subjectMap.get(a.subject_id?.toString());
      const totalStudents = classStudentCount.get(a.class_id?.toString()) || 0;
      const submitted = await Submission.countDocuments({ assignment_id: a._id });
      result.push({
        _id: a._id.toString(),
        title: a.title,
        description: a.description,
        class_id: a.class_id?.toString(),
        class_name: classDoc?.name || 'Unknown',
        subject_id: a.subject_id?.toString(),
        subject_name: subjectDoc?.name || 'Unknown',
        teacher_id: a.teacher_id.toString(),
        deadline: a.deadline ? a.deadline.toISOString() : null,
        max_score: a.max_score,
        attachments: a.attachments,
        status: a.status,
        total: totalStudents,
        submitted: submitted,
        created_at: a.created_at,
        updated_at: a.updated_at
      });
    }
    res.json({ assignments: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /assignments (dengan upload file via middleware)
exports.createAssignment = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { title, class_id, subject_id, deadline, description = '', max_score = 100 } = req.body;
    if (!title || !class_id || !subject_id || !deadline) {
      return res.status(400).json({ error: 'Judul, kelas, mapel, deadline wajib diisi' });
    }

    // Validasi class dan subject
    const classDoc = await Class.findById(class_id);
    if (!classDoc) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    const subjectDoc = await Subject.findById(subject_id);
    if (!subjectDoc) return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan' });

    // Validasi guru: apakah guru mengampu mapel dan kelas?
    const teacher = await UserGuru.findById(teacherId);
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan' });
    const teacherSubjects = teacher.subjects.map(id => id.toString());
    const teacherClasses = teacher.classes.map(id => id.toString());
    if (!teacherSubjects.includes(subject_id)) {
      return res.status(403).json({ error: 'Anda tidak diperbolehkan membuat tugas untuk mapel ini' });
    }
    if (!teacherClasses.includes(class_id)) {
      return res.status(403).json({ error: 'Anda tidak diperbolehkan membuat tugas untuk kelas ini' });
    }

    // Upload file
    const files = req.files; // dari multer.array
    const attachments = saveUploadedFiles(files);

    const newAssignment = new Assignment({
      title,
      description,
      class_id,
      subject_id,
      teacher_id: teacherId,
      deadline: new Date(deadline),
      max_score: parseInt(max_score),
      attachments,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });
    await newAssignment.save();
    res.status(201).json({ message: 'Tugas berhasil dibuat', assignment_id: newAssignment._id.toString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PUT /assignments/:assignment_id
exports.updateAssignment = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignmentId = req.params.assignment_id;
    const assignment = await Assignment.findOne({ _id: assignmentId, teacher_id: teacherId });
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan atau bukan milik Anda' });

    const { title, class_id, subject_id, deadline, description = '', max_score = 100 } = req.body;
    if (!title || !class_id || !subject_id || !deadline) {
      return res.status(400).json({ error: 'Judul, kelas, mapel, deadline wajib diisi' });
    }

    const classDoc = await Class.findById(class_id);
    if (!classDoc) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    const subjectDoc = await Subject.findById(subject_id);
    if (!subjectDoc) return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan' });

    const teacher = await UserGuru.findById(teacherId);
    const teacherSubjects = teacher.subjects.map(id => id.toString());
    const teacherClasses = teacher.classes.map(id => id.toString());
    if (!teacherSubjects.includes(subject_id)) return res.status(403).json({ error: 'Anda tidak diperbolehkan mengupdate tugas untuk mapel ini' });
    if (!teacherClasses.includes(class_id)) return res.status(403).json({ error: 'Anda tidak diperbolehkan mengupdate tugas untuk kelas ini' });

    // File upload: file baru ditambahkan, file lama tetap (bisa dihapus nanti jika perlu)
    const newFiles = req.files;
    const newAttachments = saveUploadedFiles(newFiles);
    const attachments = [...(assignment.attachments || []), ...newAttachments];

    assignment.title = title;
    assignment.description = description;
    assignment.class_id = class_id;
    assignment.subject_id = subject_id;
    assignment.deadline = new Date(deadline);
    assignment.max_score = parseInt(max_score);
    assignment.attachments = attachments;
    assignment.updated_at = new Date();
    await assignment.save();

    res.json({ message: 'Tugas berhasil diupdate' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE /assignments/:assignment_id
exports.deleteAssignment = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignmentId = req.params.assignment_id;
    const result = await Assignment.findOneAndDelete({ _id: assignmentId, teacher_id: teacherId });
    if (!result) return res.status(404).json({ error: 'Tugas tidak ditemukan atau bukan milik Anda' });
    // Opsional: hapus file fisik attachment? Bisa dilakukan nanti
    res.json({ message: 'Tugas berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /assignments/:assignment_id/submissions
exports.getSubmissions = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignmentId = req.params.assignment_id;
    const assignment = await Assignment.findOne({ _id: assignmentId, teacher_id: teacherId });
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan atau bukan milik Anda' });

    const classId = assignment.class_id;
    // Ambil semua siswa aktif di kelas tersebut
    const students = await UserSiswa.find({ class_id: classId, role: 'siswa', status: 'active' }).lean();
    // Ambil semua submission untuk assignment ini
    const submissions = await Submission.find({ assignment_id: assignmentId }).lean();
    const submissionMap = new Map();
    submissions.forEach(sub => submissionMap.set(sub.student_id.toString(), sub));

    const result = students.map(student => {
      const sub = submissionMap.get(student._id.toString());
      return {
        submission_id: sub?._id?.toString() || null,
        student_id: student._id.toString(),
        student_name: student.full_name,
        nis: student.nis,
        submitted: !!sub,
        submitted_at: sub?.submitted_at ? sub.submitted_at.toISOString() : null,
        score: sub?.score || null,
        feedback: sub?.feedback || null,
        content: sub?.content || null,
        file: sub?.file || null
      };
    });
    res.json({ submissions: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /assignments/:assignment_id/grade
exports.gradeSubmission = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const assignmentId = req.params.assignment_id;
    const { student_id, score, feedback } = req.body;
    if (!student_id || score === undefined) {
      return res.status(400).json({ error: 'student_id dan score wajib diisi' });
    }

    const assignment = await Assignment.findOne({ _id: assignmentId, teacher_id: teacherId });
    if (!assignment) return res.status(404).json({ error: 'Tugas tidak ditemukan atau bukan milik Anda' });

    const submission = await Submission.findOne({ assignment_id: assignmentId, student_id });
    if (!submission) return res.status(400).json({ error: 'Siswa belum mengumpulkan tugas' });

    submission.score = parseInt(score);
    submission.feedback = feedback;
    submission.graded_at = new Date();
    submission.status = 'graded';
    await submission.save();

    res.json({ message: 'Nilai berhasil disimpan' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /profile (guru)
exports.getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const teacher = await UserGuru.findById(teacherId).lean();
    if (!teacher) return res.status(404).json({ error: 'Guru tidak ditemukan' });

    // Ambil nama subjects
    const subjectIds = teacher.subjects || [];
    const subjects = await Subject.find({ _id: { $in: subjectIds } }).lean();
    const subjectList = subjects.map(s => ({ _id: s._id.toString(), name: s.name }));

    // Ambil nama classes
    const classIds = teacher.classes || [];
    const classes = await Class.find({ _id: { $in: classIds } }).lean();
    const classList = classes.map(c => ({ _id: c._id.toString(), name: c.name }));

    res.json({
      full_name: teacher.full_name,
      nip: teacher.nip,
      email: teacher.email,
      subjects: subjectList,
      classes: classList
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /uploads/assignments/:filename (serve file)
exports.serveAssignmentFile = (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOAD_FOLDER, filename);
  // Optional: tambahkan pengecekan apakah file milik assignment yang dibuat guru ini?
  // Untuk keamanan sederhana, kita bisa verifikasi bahwa file ada dan user login (auth sudah di middleware)
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }
  res.sendFile(path.resolve(filePath));
};