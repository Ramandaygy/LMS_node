const UserSiswa = require('../../models/UserSiswa');
const UserGuru = require('../../models/UserGuru');
const UserOrtu = require('../../models/UserOrtu');
const Subject = require('../../models/Subject');
const Progress = require('../../models/Progress');
const Assignment = require('../../models/Assignment');
const Submission = require('../../models/Submission');
const Class = require('../../models/Class');

// GET /reports/statistics
exports.getStatistics = async (req, res) => {
  try {
    const totalStudents = await UserSiswa.countDocuments();
    const totalTeachers = await UserGuru.countDocuments();
    const totalParents = await UserOrtu.countDocuments();
    const totalCourses = await Subject.countDocuments();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeToday = await Progress.countDocuments({ last_activity: { $gte: oneDayAgo } });
    const totalAssignments = await Assignment.countDocuments();
    const totalSubmissions = await Submission.countDocuments();

    res.json({
      total_students: totalStudents,
      total_teachers: totalTeachers,
      total_parents: totalParents,
      total_courses: totalCourses,
      active_today: activeToday,
      total_assignments: totalAssignments,
      total_submissions: totalSubmissions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /reports/students
exports.getStudentReport = async (req, res) => {
  try {
    // Aggregation untuk lookup class_id ke kelas
    const pipeline = [
      { $lookup: {
        from: 'classes',
        localField: 'class_id',
        foreignField: '_id',
        as: 'class_info'
      }},
      { $addFields: {
        class_name: { $arrayElemAt: ['$class_info.name', 0] }
      }},
      { $project: { password: 0, class_info: 0 } }
    ];
    const students = await UserSiswa.aggregate(pipeline);

    // Ambil progress untuk semua siswa
    const studentIds = students.map(s => s._id);
    const progresses = await Progress.find({ student_id: { $in: studentIds } }).lean();
    const progressMap = new Map();
    progresses.forEach(p => {
      progressMap.set(p.student_id.toString(), p.overall_progress || 0);
    });

    const report = students.map(student => ({
      id: student._id.toString(),
      name: student.full_name,
      nis: student.nis,
      class: student.class_name || '-',
      progress: progressMap.get(student._id.toString()) || 0
    }));

    res.json({ students: report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /reports/courses
exports.getCourseReport = async (req, res) => {
  try {
    const courses = await Subject.find().lean();
    // Catatan: total_students dan average_rating tidak tersedia di collection subjects.
    // Bisa ditambahkan nanti jika ada collection enrollment atau rating.
    const report = courses.map(course => ({
      id: course._id.toString(),
      title: course.name,
      category: '',      // Sesuaikan jika ada field category
      level: '',         // Sesuaikan jika ada field level
      total_students: 0,
      average_rating: 0
    }));
    res.json({ courses: report });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};