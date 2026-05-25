const Grade = require('../../models/Grade');
const Subject = require('../../models/Subject');
const UserGuru = require('../../models/UserGuru');

// GET /grades?subject_id=...&assignment_id=...
exports.getGrades = async (req, res) => {
  try {
    const { subject_id, assignment_id } = req.query;
    if (!subject_id) {
      return res.status(400).json({ error: 'subject_id is required' });
    }

    const teacherId = req.user.id;

    // Pastikan guru mengajar mata pelajaran ini
    const teacher = await UserGuru.findById(teacherId).select('subjects').lean();
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    if (!teacher.subjects.map(id => id.toString()).includes(subject_id)) {
      return res.status(403).json({ error: 'You are not assigned to this subject' });
    }

    const query = { subject_id };
    if (assignment_id) query.assignment_id = assignment_id;

    const grades = await Grade.find(query).lean();
    const formatted = grades.map(g => ({
      ...g,
      _id: g._id.toString(),
      subject_id: g.subject_id.toString(),
      student_id: g.student_id?.toString(),
      assignment_id: g.assignment_id?.toString()
    }));

    res.json({ grades: formatted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /grades
exports.saveGrade = async (req, res) => {
  try {
    const { subject_id, student_id, assignment_id, score, feedback } = req.body;
    if (!subject_id || !student_id || !assignment_id) {
      return res.status(400).json({ error: 'subject_id, student_id, and assignment_id are required' });
    }

    const teacherId = req.user.id;

    // Validasi guru mengajar subject tersebut
    const teacher = await UserGuru.findById(teacherId).select('subjects').lean();
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }
    if (!teacher.subjects.map(id => id.toString()).includes(subject_id)) {
      return res.status(403).json({ error: 'You are not assigned to this subject' });
    }

    // Optional: cek apakah assignment_id milik guru (bisa ditambahkan jika perlu)

    const gradeData = {
      subject_id,
      student_id,
      assignment_id,
      score: score || 0,
      feedback: feedback || '',
      graded_at: new Date(),
      updated_at: new Date()
    };

    // Upsert grade
    await Grade.findOneAndUpdate(
      { subject_id, student_id, assignment_id },
      { $set: gradeData },
      { upsert: true, new: true }
    );

    res.json({ message: 'Grade saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};