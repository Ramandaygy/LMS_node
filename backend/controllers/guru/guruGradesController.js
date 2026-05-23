const Course = require('../../models/Course');
const Grade = require('../../models/Grade');

// GET /grades?course_id=...&assignment_id=...
exports.getGrades = async (req, res) => {
  try {
    const { course_id, assignment_id } = req.query;
    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    const teacherId = req.user.id;

    // Cek apakah course milik guru
    const course = await Course.findOne({ _id: course_id, instructor_id: teacherId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found or not yours' });
    }

    const query = { course_id };
    if (assignment_id) query.assignment_id = assignment_id;

    const grades = await Grade.find(query).lean();
    const formatted = grades.map(g => ({
      ...g,
      _id: g._id.toString(),
      course_id: g.course_id.toString(),
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
    const { course_id, student_id, assignment_id, score, feedback } = req.body;
    if (!course_id || !student_id || !assignment_id) {
      return res.status(400).json({ error: 'course_id, student_id, and assignment_id are required' });
    }

    const teacherId = req.user.id;

    // Cek apakah course milik guru
    const course = await Course.findOne({ _id: course_id, instructor_id: teacherId });
    if (!course) {
      return res.status(404).json({ error: 'Course not found or not yours' });
    }

    const gradeData = {
      course_id,
      student_id,
      assignment_id,
      score: score || 0,
      feedback: feedback || '',
      graded_at: new Date(),
      updated_at: new Date()
    };

    // Upsert: update jika sudah ada, insert jika belum
    await Grade.findOneAndUpdate(
      { course_id, student_id, assignment_id },
      { $set: gradeData },
      { upsert: true, new: true }
    );

    res.json({ message: 'Grade saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};