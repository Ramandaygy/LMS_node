const User = require('../models/UserSiswa');
const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const Assignment = require('../models/Assignment');
const { ObjectId } = require('mongoose').Types;

exports.getStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    let stats = {};

    if (userRole === 'admin') {
      const totalStudents = await User.countDocuments({ role: 'siswa' });
      const totalTeachers = await User.countDocuments({ role: 'guru' });
      const totalParents = await User.countDocuments({ role: 'ortu' });
      const totalAdmins = await User.countDocuments({ role: 'admin' });
      const totalCourses = await Course.countDocuments();
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const activeToday = await Progress.countDocuments({ lastActivity: { $gte: oneDayAgo } });

      stats = { totalStudents, totalTeachers, totalParents, totalAdmins, totalCourses, activeToday };
    }
    else if (userRole === 'guru') {
      const teacher = await User.findById(userId);
      const classIds = teacher.profile?.classes || [];
      let totalStudents = 0;
      if (classIds.length) {
        totalStudents = await User.countDocuments({ role: 'siswa', 'profile.classId': { $in: classIds }, status: 'active' });
      }
      const totalCourses = await Assignment.countDocuments({ teacher: userId });
      const pendingAssignments = 0; // bisa dihitung dari submission
      stats = { totalStudents, totalCourses, pendingAssignments };
    }
    else if (userRole === 'siswa') {
      const enrolledCourses = await Enrollment.countDocuments({ student: userId, status: 'active' });
      const progressDoc = await Progress.findOne({ student: userId });
      const overallProgress = progressDoc ? progressDoc.overallProgress : 0;
      const upcomingDeadlines = 0; // bisa dihitung dari assignment
      stats = { enrolled_courses: enrolledCourses, overall_progress: overallProgress, upcoming_deadlines: upcomingDeadlines };
    }
    else if (userRole === 'ortu') {
      const parent = await User.findById(userId);
      const childrenIds = parent.profile?.children || [];
      const totalChildren = childrenIds.length;
      let averageProgress = 0;
      if (totalChildren) {
        const progresses = await Progress.find({ student: { $in: childrenIds } });
        const total = progresses.reduce((sum, p) => sum + p.overallProgress, 0);
        averageProgress = total / totalChildren;
      }
      stats = { total_children: totalChildren, average_progress: Math.round(averageProgress * 10) / 10 };
    }

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getActivity = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    let activities = [];

    if (userRole === 'siswa') {
      const progresses = await Progress.find({ student: userId })
        .sort({ lastActivity: -1 })
        .limit(5)
        .populate('course', 'title');
      for (let p of progresses) {
        activities.push({
          course_id: p.course._id,
          course_title: p.course.title,
          overall_progress: p.overallProgress,
          last_activity: p.lastActivity
        });
      }
    }
    else if (userRole === 'ortu') {
      const parent = await User.findById(userId);
      const childrenIds = parent.profile?.children || [];
      const students = await User.find({ _id: { $in: childrenIds } });
      for (let student of students) {
        const progress = await Progress.findOne({ student: student._id });
        activities.push({
          student_name: student.name,
          student_nis: student.profile?.nis,
          progress: progress ? progress.overallProgress : 0,
          last_activity: progress ? progress.lastActivity : null
        });
      }
    }

    res.json({ activities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};