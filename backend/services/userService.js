const bcrypt = require('bcryptjs');

const User = require('../models/User');

// ======================================
// GET ALL USERS
// ======================================
exports.getAllUsers = async () => {

  return await User.find()
    .select('-password')
    .sort({ created_at: -1 });

};

// ======================================
// GET USER BY ID
// ======================================
exports.getUserById = async (id) => {

  return await User.findById(id)
    .select('-password');

};

// ======================================
// GET USERS BY ROLE
// ======================================
exports.getUsersByRole = async (
  role
) => {

  return await User.find({
    role,
  })
    .select('-password')
    .sort({ created_at: -1 });

};
// ======================================
// CREATE USER
// ======================================
exports.createUser = async (body) => {

  const {
    username,
    email,
    password,
    role,
    full_name,
    phone,
  } = body;

  const existingEmail =
    await User.findOne({ email });

  if (existingEmail) {
    throw new Error(
      'Email already registered'
    );
  }

  const existingUsername =
    await User.findOne({ username });

  if (existingUsername) {
    throw new Error(
      'Username already used'
    );
  }

  const hashedPassword =
    await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    password: hashedPassword,
    role,
    full_name,
    phone,
  });

  return user;
};

// ======================================
// UPDATE USER
// ======================================
exports.updateUser = async (
  id,
  body
) => {

  const updatedUser =
    await User.findByIdAndUpdate(
      id,
      body,
      {
        new: true,
      }
    ).select('-password');

  return updatedUser;
};

// ======================================
// DELETE USER
// ======================================
exports.deleteUser = async (id) => {

  await User.findByIdAndDelete(id);

};