const User = require('../models/User');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Module = require('../models/Module');

// ======================================
// GET DASHBOARD STATS
// ======================================
exports.getDashboardStats =
  async (req, res) => {

    try {

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

      const total_classes =
        await Class.countDocuments();

      const total_subjects =
        await Subject.countDocuments();

      const total_modules =
        await Module.countDocuments();

      return res.status(200).json({
        success: true,

        total_students,
        total_teachers,
        total_parents,
        total_classes,
        total_subjects,
        total_modules,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to load dashboard stats',
      });
    }
  };