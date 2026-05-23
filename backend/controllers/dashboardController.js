const UserSiswa = require('../models/UserSiswa');
const UserGuru = require('../models/UserGuru');
const UserOrtu = require('../models/UserOrtu');
const UserAdmin = require('../models/UserAdmin');
const Subject = require('../models/Subject');       // sebagai pengganti courses
const Class = require('../models/Class');           // fallback untuk total_courses
const Assignment = require('../models/Assignment');
const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment'); // opsional, jika ada
const { getStudentsByParent } = require('../utils/userHelper');
const { ObjectId } = require('mongoose').Types;

// GET /dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    let stats = {};

    if (userRole === 'admin') {
      const totalStudents = await UserSiswa.countDocuments();
      const totalTeachers = await UserGuru.countDocuments();
      const totalParents = await UserOrtu.countDocuments();
      const totalAdmins = await UserAdmin.countDocuments();
      let totalCourses = await Subject.countDocuments();
      if (totalCourses === 0) totalCourses = await Class.countDocuments(); // fallback
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeToday = await Progress.countDocuments({ last_activity: { $gte: oneDayAgo } });
      stats = { totalStudents, totalTeachers, totalParents, totalAdmins, totalCourses, activeToday };
    }
    else if (userRole === 'guru') {
      const teacher = await UserGuru.findById(userId).lean();
      const classIds = teacher?.classes || [];
      let totalStudents = 0;
      if (classIds.length) {
        totalStudents = await UserSiswa.countDocuments({ class_id: { $in: classIds }, status: 'active' });
      }
      const totalCourses = await Assignment.countDocuments({ teacher_id: userId });
      const pendingAssignments = 0; // dapat dihitung dari submissions yang belum dinilai
      stats = { totalStudents, totalCourses, pendingAssignments };
    }
    else if (userRole === 'siswa') {
      let enrolledCourses = 0;
      try {
        enrolledCourses = await Enrollment.countDocuments({ student_id: userId, status: 'active' });
      } catch (err) { enrolledCourses = 0; }
      const progress = await Progress.findOne({ student_id: userId });
      const overallProgress = progress ? progress.overall_progress : 0;
      const upcomingDeadlines = 0;
      stats = { enrolled_courses: enrolledCourses, overall_progress: overallProgress, upcoming_deadlines: upcomingDeadlines };
    }
    else if (userRole === 'ortu') {
      const students = await getStudentsByParent(userId);
      const totalChildren = students.length;
      let totalProgress = 0;
      for (const student of students) {
        const progress = await Progress.findOne({ student_id: student._id });
        if (progress) totalProgress += progress.overall_progress || 0;
      }
      const averageProgress = totalChildren ? Math.round((totalProgress / totalChildren) * 10) / 10 : 0;
      stats = { total_children: totalChildren, average_progress: averageProgress };
    }

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /dashboard/activity
exports.getActivity = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    let activities = [];

    if (userRole === 'siswa') {
      const progresses = await Progress.find({ student_id: userId })
        .sort({ last_activity: -1 })
        .limit(5)
        .lean();
      for (const activity of progresses) {
        let courseTitle = 'Course';
        let courseId = activity.subject_id; // asumsi field subject_id
        if (courseId) {
          const subject = await Subject.findById(courseId).lean();
          courseTitle = subject ? subject.name : 'Unknown';
        }
        activities.push({
          course_id: courseId ? courseId.toString() : null,
          course_title: courseTitle,
          overall_progress: activity.overall_progress || 0,
          last_activity: activity.last_activity ? activity.last_activity.toISOString() : null
        });
      }
    }
    else if (userRole === 'ortu') {
      const students = await getStudentsByParent(userId);
      for (const student of students) {
        const progress = await Progress.findOne({ student_id: student._id }).lean();
        activities.push({
          student_name: student.full_name,
          student_nis: student.nis,
          progress: progress ? (progress.overall_progress || 0) : 0,
          last_activity: progress && progress.last_activity ? progress.last_activity.toISOString() : null
        });
      }
    }

    res.json({ activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};