const User = require('../models/User');

exports.getDashboardStats = async () => {

  const total_students =
    await User.countDocuments({
      role: 'siswa',
    });

  const total_teachers =
    await User.countDocuments({
      role: 'guru',
    });

  const total_parents =
    await User.countDocuments({
      role: 'ortu',
    });

  return {
    total_students,
    total_teachers,
    total_parents,
    active_today: 0,
  };
};