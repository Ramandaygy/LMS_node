const attendanceService = require(
  '../services/attendanceService'
);

// ======================================
// CREATE ATTENDANCE
// ======================================
exports.createAttendance =
  async (req, res) => {

    try {

      const attendance =
        await attendanceService.createAttendance(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: attendance,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create attendance',
      });
    }
  };

// ======================================
// GET ALL ATTENDANCE
// ======================================
exports.getAllAttendance =
  async (req, res) => {

    try {

      const attendance =
        await attendanceService.getAllAttendance();

      return res.status(200).json({
        success: true,
        data: attendance,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch attendance',
      });
    }
  };