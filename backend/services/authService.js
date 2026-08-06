const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const emailService = require('./emailService');

// ======================================
// DYNAMIC COLLECTION GETTER
// ======================================
const getCollection = (name) => mongoose.connection.collection(name);

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
    case 'super_admin':
    case 'wakil_kurikulum':
      collection = getCollection('users_admin');
      break;
    case 'guru':
    case 'bk':
      collection = getCollection('users_guru');
      break;
    case 'siswa':
      collection = getCollection('users_siswa');
      break;
    case 'ortu':
      collection = getCollection('users_ortu');
      break;
    default:
      throw new Error('Invalid role');
  }

  const existingUser = await collection.findOne({
    email: emailLower,
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  let children = [];

  if (role === 'ortu' && student_nis) {
    const student = await getCollection('users_siswa').findOne({ nis: student_nis });
    if (!student) {
      throw new Error('Data siswa dengan NIS tersebut tidak ditemukan');
    }
    children.push(student._id);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await collection.insertOne({
    username,
    email: emailLower,
    password: hashedPassword,
    role,
    full_name: full_name || '',
    phone: phone || '',
    nik: nik || '',
    children: children,
    is_active: true,
    is_verified: false,
    permissions: [],
    profileImage: '',
    profile: {},
    created_at: new Date(),
    updated_at: new Date(),
  });

  return {
    id: result.insertedId,
    username,
    email: emailLower,
    role,
  };
};

// ======================================
// LOGIN
// ======================================

exports.login = async (body) => {
  const { email, password } = body;

  console.log('LOGIN BODY:', body);

  const emailLower = email.toLowerCase();
  let user = null;

  const query = { $or: [{ email: emailLower }, { username: email }] };

  user = await getCollection('users_admin').findOne(query);
  if (!user) user = await getCollection('users_guru').findOne(query);
  if (!user) user = await getCollection('users_siswa').findOne(query);
  if (!user) user = await getCollection('users_ortu').findOne(query);


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
        expiresIn: '30d',
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

// ======================================
// FORGOT & RESET PASSWORD (OTP)
// ======================================

async function findUserAcrossCollections(emailLower) {
  const collections = [
    { name: 'users_siswa', role: 'siswa' },
    { name: 'users_guru', role: 'guru' },
    { name: 'users_admin', role: 'admin' },
    { name: 'users_ortu', role: 'ortu' }
  ];

  for (const item of collections) {
    const col = getCollection(item.name);
    const user = await col.findOne({ email: emailLower });
    if (user) {
      return { user, collection: col, role: item.role };
    }
  }
  return null;
}

exports.forgotPassword = async (email) => {
  if (!email) throw new Error('Email wajib diisi');
  const emailLower = email.toLowerCase().trim();
  const match = await findUserAcrossCollections(emailLower);

  if (!match) {
    throw new Error('Email tidak terdaftar pada sistem LMS');
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await match.collection.updateOne(
    { _id: match.user._id },
    {
      $set: {
        reset_otp: otpCode,
        reset_otp_expires: expiresAt
      }
    }
  );

  await emailService.sendOtpEmail(emailLower, otpCode, match.user.full_name || 'Pengguna');

  return {
    message: 'Kode OTP telah dikirimkan ke email Anda',
    email: emailLower,
    dev_otp: process.env.NODE_ENV !== 'production' ? otpCode : undefined
  };
};

exports.verifyOtp = async (email, otp) => {
  if (!email || !otp) throw new Error('Email dan Kode OTP wajib diisi');
  const emailLower = email.toLowerCase().trim();
  const match = await findUserAcrossCollections(emailLower);

  if (!match || !match.user.reset_otp) {
    throw new Error('Kode OTP tidak ditemukan atau belum pernah diminta');
  }

  if (match.user.reset_otp !== otp.trim()) {
    throw new Error('Kode OTP tidak sesuai / salah');
  }

  if (new Date() > new Date(match.user.reset_otp_expires)) {
    throw new Error('Kode OTP telah kedaluwarsa. Silakan minta kode baru');
  }

  return { verified: true, message: 'Kode OTP valid' };
};

exports.resetPassword = async (email, otp, newPassword) => {
  if (!email || !otp || !newPassword) throw new Error('Semua data wajib diisi');
  if (newPassword.length < 6) throw new Error('Password minimal 6 karakter');

  await exports.verifyOtp(email, otp);

  const emailLower = email.toLowerCase().trim();
  const match = await findUserAcrossCollections(emailLower);

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await match.collection.updateOne(
    { _id: match.user._id },
    {
      $set: { password: hashedPassword },
      $unset: { reset_otp: '', reset_otp_expires: '' }
    }
  );

  return { success: true, message: 'Password berhasil diubah. Silakan login kembali' };
};