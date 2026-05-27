const Schedule = require(
  '../models/Schedule'
);

// ======================================
// CREATE SCHEDULE
// ======================================
exports.createSchedule =
  async (data) => {

    return await Schedule.create(
      data
    );
  };

// ======================================
// GET ALL SCHEDULES
// ======================================
exports.getAllSchedules =
  async () => {

    return await Schedule.find()
      .populate(
        'teacher',
        'full_name'
      )
      .populate(
        'class',
        'name'
      )
      .populate(
        'subject',
        'name'
      )
      .sort({ createdAt: -1 });
  };