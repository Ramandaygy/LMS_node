const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserByUsername, verifyPassword, userModels } = require('../utils/userHelper');
const UserSiswa = require('../models/UserSiswa');
const UserGuru = require('../models/UserGuru');
const UserOrtu = require('../models/UserOrtu');
const UserAdmin = require('../models/UserAdmin');
const Class = require('../models/Class');
const AcademicYear = require('../models/AcademicYear');
const { ObjectId } = require('mongoose').Types;

const generateToken = (userId, email, username, role) => {
  return jwt.sign(
    { user: { id: userId, email, username, role } },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Register (sama persis dengan logic di auth.py)
exports.register = async (req, res) => {
  try {
    const data = req.body;
    const required = ['email', 'username', 'password', 'full_name', 'role'];
    for (let f of required) if (!data[f]) return res.status(400).json({ error: `${f} is required` });

    const allowedRoles = ['siswa', 'guru', 'ortu', 'admin'];
    if (!allowedRoles.includes(data.role)) return res.status(400).json({ error: 'Invalid role' });

    // Cek email exist di semua koleksi
    let existing = await findUserByEmail(data.email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    existing = await findUserByUsername(data.username);
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    let newUser;

    if (data.role === 'siswa') {
      if (!data.nis) return res.status(400).json({ error: 'NIS required' });
      if (!data.class_id) return res.status(400).json({ error: 'class_id required' });
      if (!data.academic_year_id) return res.status(400).json({ error: 'academic_year_id required' });
      if (!ObjectId.isValid(data.class_id)) return res.status(400).json({ error: 'Invalid class_id' });
      if (!ObjectId.isValid(data.academic_year_id)) return res.status(400).json({ error: 'Invalid academic_year_id' });

      const classDoc = await Class.findById(data.class_id);
      if (!classDoc) return res.status(400).json({ error: 'Class not found' });
      const yearDoc = await AcademicYear.findById(data.academic_year_id);
      if (!yearDoc) return res.status(400).json({ error: 'Academic year not found' });

      const existingNis = await UserSiswa.findOne({ nis: data.nis });
      if (existingNis) return res.status(400).json({ error: 'NIS already registered' });

      newUser = new UserSiswa({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        full_name: data.full_name,
        nis: data.nis,
        class_id: data.class_id,
        parent_id: data.parent_id || null,
        academic_year_id: data.academic_year_id,
        status: 'active',
        profile: { phone: data.phone, address: data.address }
      });
    } 
    else if (data.role === 'guru') {
      if (!data.nip) return res.status(400).json({ error: 'NIP required' });
      const existingNip = await UserGuru.findOne({ nip: data.nip });
      if (existingNip) return res.status(400).json({ error: 'NIP already registered' });

      newUser = new UserGuru({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        full_name: data.full_name,
        nip: data.nip,
        subjects: data.subjects || [],
        classes: data.classes || [],
        phone: data.phone,
        is_active: true
      });
    }
    else if (data.role === 'ortu') {
      if (!data.nik) return res.status(400).json({ error: 'NIK required' });
      const existingNik = await UserOrtu.findOne({ nik: data.nik });
      if (existingNik) return res.status(400).json({ error: 'NIK already registered' });

      newUser = new UserOrtu({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        full_name: data.full_name,
        nik: data.nik,
        children: data.children || [],
        phone: data.phone,
        is_active: true
      });
    }
    else { // admin
      newUser = new UserAdmin({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        full_name: data.full_name,
        permissions: data.permissions || ['all'],
        phone: data.phone,
        is_active: true
      });
    }

    await newUser.save();
    const token = generateToken(newUser._id, newUser.email, newUser.username, data.role);

    res.status(201).json({
      message: `${data.role.charAt(0).toUpperCase() + data.role.slice(1)} registered successfully`,
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        username: newUser.username,
        full_name: newUser.full_name,
        role: data.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    let user = await findUserByEmail(email);
    if (!user) user = await findUserByUsername(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // Cek status aktif (sesuai role)
    if (user.role === 'siswa' && user.status !== 'active') return res.status(401).json({ error: 'Account not active' });
    if (user.role !== 'siswa' && user.is_active === false) return res.status(401).json({ error: 'Account disabled' });

    const isValid = await verifyPassword(user, password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateToken(user._id, user.email, user.username, user.role);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get current user (me)
exports.getMe = async (req, res) => {
  try {
    const { id, role } = req.user;
    const Model = userModels[role];
    if (!Model) return res.status(404).json({ error: 'User not found' });
    const user = await Model.findById(id).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    delete user.password;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Register admin (sederhana)
exports.registerAdmin = async (req, res) => {
  try {
    const data = req.body;
    const required = ['email', 'username', 'password', 'full_name'];
    for (let f of required) if (!data[f]) return res.status(400).json({ error: `${f} required` });
    const existing = await UserAdmin.findOne({ email: data.email });
    if (existing) return res.status(400).json({ error: 'Admin already exists' });
    const hashed = await bcrypt.hash(data.password, 10);
    const admin = new UserAdmin({
      email: data.email,
      username: data.username,
      password: hashed,
      full_name: data.full_name,
      permissions: ['all'],
      is_active: true
    });
    await admin.save();
    res.status(201).json({ message: 'Admin registered', admin_id: admin._id });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};