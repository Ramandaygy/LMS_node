const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');

exports.register = async (body) => {
  const {
    username,
    email,
    password,
    role,
    full_name,
    phone,
  } = body;

  const existingUser = await User.findOne({
    email: email.toLowerCase(),
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const hashedPassword = await bcrypt.hash(
    password,
    10
  );

  const user = await User.create({
    username,
    email: email.toLowerCase(),
    password: hashedPassword,
    role,
    full_name,
    phone,
  });

  return {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  };
};

exports.login = async (body) => {
  const { email, password } = body;

  console.log('LOGIN BODY:', body);

  const user = await User.findOne({
    email: email.toLowerCase(),
  });

  console.log('FOUND USER:', user);

  if (!user) {
    throw new Error('User not found');
  }

  if (!user.is_active) {
    throw new Error('User account disabled');
  }

  const isMatch = await bcrypt.compare(
    password,
    user.password
  );

  console.log('PASSWORD MATCH:', isMatch);

  if (!isMatch) {
    throw new Error('Invalid password');
  }

  user.lastLogin = new Date();

  await user.save();

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
      phone: user.phone,
      profileImage: user.profileImage,
    },
  };
};