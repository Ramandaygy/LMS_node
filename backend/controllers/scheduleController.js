const scheduleService = require(
  '../services/scheduleService'
);

// ======================================
// CREATE SCHEDULE
// ======================================
exports.createSchedule =
  async (req, res) => {

    try {

      const schedule =
        await scheduleService.createSchedule(
          req.body
        );

      return res.status(201).json({
        success: true,
        data: schedule,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to create schedule',
      });
    }
  };

// ======================================
// GET ALL SCHEDULES
// ======================================
exports.getAllSchedules =
  async (req, res) => {

    try {

      const schedules =
        await scheduleService.getAllSchedules();

      return res.status(200).json({
        success: true,
        data: schedules,
      });

    } catch (err) {

      console.error(err);

      return res.status(500).json({
        success: false,
        message:
          'Failed to fetch schedules',
      });
    }
  };