const userService = require('../services/userService');

// ======================================
// GET ALL USERS
// ======================================
exports.getAllUsers = async (req, res) => {
  try {

    const users =
      await userService.getAllUsers();

    return res.status(200).json({
      success: true,
      data: users,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

// ======================================
// GET USER BY ID
// ======================================
exports.getUserById = async (req, res) => {
  try {

    const user =
      await userService.getUserById(
        req.params.id
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
};

// ======================================
// GET STUDENTS
// ======================================
exports.getStudents = async (
  req,
  res
) => {
  try {

    const students =
      await userService.getUsersByRole(
        'siswa'
      );

    return res.status(200).json({
      success: true,
      data: students,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch students',
    });
  }
};

// ======================================
// GET TEACHERS
// ======================================
exports.getTeachers = async (
  req,
  res
) => {
  try {

    const teachers =
      await userService.getUsersByRole(
        'guru'
      );

    return res.status(200).json({
      success: true,
      data: teachers,
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch teachers',
    });
  }
};

// ======================================
// CREATE USER
// ======================================
exports.createUser = async (req, res) => {
  try {

    const user =
      await userService.createUser(
        req.body
      );

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });

  } catch (err) {

    console.error(err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// UPDATE USER
// ======================================
exports.updateUser = async (req, res) => {
  try {

    const user =
      await userService.updateUser(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });

  } catch (err) {

    console.error(err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

// ======================================
// DELETE USER
// ======================================
exports.deleteUser = async (req, res) => {
  try {

    await userService.deleteUser(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (err) {

    console.error(err);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};