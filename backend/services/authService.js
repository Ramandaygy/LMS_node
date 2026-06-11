const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// ======================================
// COLLECTIONS
// ======================================

const adminCollection =
  mongoose.connection.collection(
    'users_admin'
  );

const guruCollection =
  mongoose.connection.collection(
    'users_guru'
  );

const siswaCollection =
  mongoose.connection.collection(
    'users_siswa'
  );

const ortuCollection =
  mongoose.connection.collection(
    'users_ortu'
  );

// ======================================
// REGISTER
// ======================================

exports.register = async (body) => {

  const {
    username,
    email,
    password,
    role,
    full_name,
    phone,
    student_nis,
    nik,
  } = body;

  const emailLower =
    email.toLowerCase();

  let collection;

  switch (role) {

    case 'admin':
      collection = adminCollection;
      break;

    case 'guru':
      collection = guruCollection;
      break;

    case 'siswa':
      collection = siswaCollection;
      break;

    case 'ortu':
      collection = ortuCollection;
      break;

    default:
      throw new Error(
        'Invalid role'
      );
  }

  const existingUser =
    await collection.findOne({
      email: emailLower,
    });

  if (existingUser) {
    throw new Error(
      'Email already registered'
    );
  }

  let children = [];

  if (role === 'ortu' && student_nis) {
    const student = await siswaCollection.findOne({ nis: student_nis });
    if (!student) {
      throw new Error('Data siswa dengan NIS tersebut tidak ditemukan');
    }
    children.push(student._id);
  }

  const hashedPassword =
    await bcrypt.hash(
      password,
      10
    );

  const result =
    await collection.insertOne({

      username,

      email: emailLower,

      password: hashedPassword,

      role,

      full_name:
        full_name || '',

      phone:
        phone || '',

      nik:
        nik || '',

      children: children,

      is_active: true,

      is_verified: false,

      permissions: [],

      profileImage: '',

      profile: {},

      created_at:
        new Date(),

      updated_at:
        new Date(),
    });

  return {

    id:
      result.insertedId,

    username,

    email:
      emailLower,

    role,
  };
};

// ======================================
// LOGIN
// ======================================

exports.login = async (body) => {

  const {
    email,
    password,
  } = body;

  console.log(
    'LOGIN BODY:',
    body
  );

  const emailLower =
    email.toLowerCase();

  let user = null;

  // ======================================
  // SEARCH ADMIN
  // ======================================

  user =
    await adminCollection.findOne({
      email: emailLower,
    });

  // ======================================
  // SEARCH GURU
  // ======================================

  if (!user) {

    user =
      await guruCollection.findOne({
        email: emailLower,
      });
  }

  // ======================================
  // SEARCH SISWA
  // ======================================

  if (!user) {

    user =
      await siswaCollection.findOne({
        email: emailLower,
      });
  }

  // ======================================
  // SEARCH ORTU
  // ======================================

  if (!user) {

    user =
      await ortuCollection.findOne({
        email: emailLower,
      });
  }

  console.log(
    'FOUND USER:',
    user
  );

  if (!user) {
    throw new Error(
      'User not found'
    );
  }

  if (
    user.is_active === false
  ) {
    throw new Error(
      'User account disabled'
    );
  }

  // ======================================
  // PASSWORD DEBUG
  // ======================================

  console.log(
    'PASSWORD TYPE:',
    typeof user.password
  );

  console.log(
    'PASSWORD RAW:',
    user.password
  );

  let hashedPassword =
    user.password;

  try {

    if (
      user.password &&
      typeof user.password !==
        'string'
    ) {

      // BSON Binary
      if (
        user.password.buffer
      ) {

        hashedPassword =
          Buffer.from(
            user.password.buffer
          ).toString('utf8');

        console.log(
          'CONVERTED HASH:',
          hashedPassword
        );
      }

      // Mongo Binary value()
      else if (
        typeof user.password.value ===
        'function'
      ) {

        hashedPassword =
          user.password
            .value()
            .toString();

        console.log(
          'CONVERTED HASH:',
          hashedPassword
        );
      }
    }

  } catch (err) {

    console.log(
      'HASH CONVERSION ERROR:',
      err.message
    );
  }

  // ======================================
  // CHECK PASSWORD
  // ======================================

  const isMatch =
    await bcrypt.compare(
      password,
      hashedPassword
    );

  console.log(
    'PASSWORD MATCH:',
    isMatch
  );

  if (!isMatch) {

    throw new Error(
      'Invalid password'
    );
  }

  // ======================================
  // UPDATE LAST LOGIN
  // ======================================

  try {

    let collection;

    switch (user.role) {

      case 'admin':
        collection =
          adminCollection;
        break;

      case 'guru':
        collection =
          guruCollection;
        break;

      case 'siswa':
        collection =
          siswaCollection;
        break;

      case 'ortu':
        collection =
          ortuCollection;
        break;
    }

    if (collection) {

      await collection.updateOne(
        {
          _id: user._id,
        },
        {
          $set: {
            lastLogin:
              new Date(),
          },
        }
      );
    }

  } catch (err) {

    console.log(
      'LAST LOGIN UPDATE ERROR:',
      err.message
    );
  }

  // ======================================
  // GENERATE TOKEN
  // ======================================

  const token =
    jwt.sign(
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

      id:
        user._id,

      username:
        user.username,

      email:
        user.email,

      role:
        user.role,

      full_name:
        user.full_name,

      phone:
        user.phone,

      profileImage:
        user.profileImage ||
        '',
    },
  };
};