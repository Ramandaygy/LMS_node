const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// ======================================
// GET DASHBOARD STATS
// ======================================
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      total_students,
      total_teachers,
      total_parents,
      total_classes,
      total_subjects
    ] = await Promise.all([
      mongoose.connection.collection('users_siswa').countDocuments({ role: 'siswa' }),
      mongoose.connection.collection('users_guru').countDocuments({ role: 'guru' }),
      mongoose.connection.collection('users_ortu').countDocuments({ role: 'ortu' }),
      Class.countDocuments(),
      Subject.countDocuments()
    ]);

    return res.status(200).json({
      success: true,
      total_students,
      total_teachers,
      total_parents,
      total_classes,
      total_subjects
    });
  } catch (err) {
    console.error('Error in getDashboardStats:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load dashboard stats',
      error: err.message
    });
  }
};

// ======================================
// GET PARENT DASHBOARD
// ======================================
exports.getParentDashboard = async (req, res) => {
  try {
    const parentId = req.user.id;

    const parent = await mongoose.connection
      .collection('users_ortu')
      .findOne({
        _id: new mongoose.Types.ObjectId(parentId)
      });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    const childrenIds = parent.children || [];

    const students = await mongoose.connection
      .collection('users_siswa')
      .find({
        _id: {
          $in: childrenIds
        }
      })
      .toArray();

    return res.json({
      success: true,
      total_children: students.length,
      children: students
    });
  } catch (err) {
    console.error('Error in getParentDashboard:', err);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
};

// ======================================
// GET ACTIVITY LOGS
// ======================================
exports.getActivityLogs = async (req, res) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    const logs = await ActivityLog.find()
      .sort({ created_at: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: logs
    });
  } catch (err) {
    console.error('Error in getActivityLogs:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch activity logs'
    });
  }
};