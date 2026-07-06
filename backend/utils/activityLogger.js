const ActivityLog = require('../models/ActivityLog');

exports.logActivity = async (req, action, detail) => {
  try {
    let userId = null;
    let userName = 'System';
    let userRole = 'system';

    if (req && req.user) {
      userId = req.user.id || req.user._id;
      userName = req.user.full_name || req.user.username || 'User';
      userRole = req.user.role || 'user';
    }

    await ActivityLog.create({
      user_id: userId,
      user_name: userName,
      user_role: userRole,
      action,
      detail
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
};
