const Attendance = require(
  '../models/Attendance'
);

// ======================================
// CREATE ATTENDANCE
// ======================================
exports.createAttendance =
  async (data) => {

    return await Attendance.create(
      data
    );
  };

// ======================================
// GET ALL ATTENDANCE
// ======================================
exports.getAllAttendance =
  async () => {

    return await Attendance.find()
      .populate(
        'student',
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

// ======================================
// GET ATTENDANCE BY ID
// ======================================
exports.getAttendanceById =
  async (id) => {

    return await Attendance.findById(id)
      .populate(
        'student',
        'full_name'
      )
      .populate(
        'class',
        'name'
      )
      .populate(
        'subject',
        'name'
      );
  };

// ======================================
// UPDATE ATTENDANCE
// ======================================
exports.updateAttendance =
  async (id, data) => {

    return await Attendance.findByIdAndUpdate(
      id,
      data,
      { new: true }
    );
  };

// ======================================
// DELETE ATTENDANCE
// ======================================
exports.deleteAttendance =
  async (id) => {

    return await Attendance.findByIdAndDelete(
      id
    );
  };