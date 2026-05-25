const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUserByEmail, findUserByUsername, findUserById, verifyPassword } = require('../utils/userHelper');
const UserSiswa = require('../models/UserSiswa');
const UserGuru = require('../models/UserGuru');
const UserOrtu = require('../models/UserOrtu');
const UserAdmin = require('../models/UserAdmin');
const Class = require('../models/Class');
const AcademicYear = require('../models/AcademicYear');
const Subject = require('../models/Subject');
const { ObjectId } = require('mongoose').Types;

const generateToken = (userId, email, username, role) => {
  return jwt.sign(
    { user: { id: userId, email, username, role } },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

exports.register = async (req, res) => {
  try {
    const data = req.body;
    const required = ['email', 'username', 'password', 'full_name', 'role'];
    for (let f of required) if (!data[f]) return res.status(400).json({ error: `${f} is required` });
    if (!validateEmail(data.email)) return res.status(400).json({ error: 'Invalid email format' });
    const allowedRoles = ['siswa', 'guru', 'ortu', 'admin'];
    if (!allowedRoles.includes(data.role)) return res.status(400).json({ error: 'Invalid role' });

    let existing = await findUserByEmail(data.email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    existing = await findUserByUsername(data.username);
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    // Validasi role-specific (tidak ada perubahan)
    if (data.role === 'siswa') {
      if (!data.nis) return res.status(400).json({ error: 'NIS required for students' });
      if (!data.class_id) return res.status(400).json({ error: 'class_id required for students' });
      if (!data.academic_year_id) return res.status(400).json({ error: 'academic_year_id required for students' });
      if (!ObjectId.isValid(data.class_id)) return res.status(400).json({ error: 'Invalid class_id format' });
      if (!ObjectId.isValid(data.academic_year_id)) return res.status(400).json({ error: 'Invalid academic_year_id format' });
      const classDoc = await Class.findById(data.class_id);
      if (!classDoc) return res.status(400).json({ error: 'Class not found' });
      const yearDoc = await AcademicYear.findById(data.academic_year_id);
      if (!yearDoc) return res.status(400).json({ error: 'Academic year not found' });
      const existingNis = await UserSiswa.findOne({ nis: data.nis });
      if (existingNis) return res.status(400).json({ error: 'NIS already registered' });
      if (data.parent_id && !ObjectId.isValid(data.parent_id)) return res.status(400).json({ error: 'Invalid parent_id format' });
    } else if (data.role === 'guru') {
      if (!data.nip) return res.status(400).json({ error: 'NIP required for teachers' });
      const existingNip = await UserGuru.findOne({ nip: data.nip });
      if (existingNip) return res.status(400).json({ error: 'NIP already registered' });
      if (data.subjects) {
        if (!Array.isArray(data.subjects)) return res.status(400).json({ error: 'subjects must be a list' });
        for (let sid of data.subjects) {
          if (!ObjectId.isValid(sid)) return res.status(400).json({ error: `Invalid subject ID: ${sid}` });
          const subj = await Subject.findById(sid);
          if (!subj) return res.status(400).json({ error: `Subject ${sid} not found` });
        }
      }
      if (data.classes) {
        if (!Array.isArray(data.classes)) return res.status(400).json({ error: 'classes must be a list' });
        for (let cid of data.classes) {
          if (!ObjectId.isValid(cid)) return res.status(400).json({ error: `Invalid class ID: ${cid}` });
          const cls = await Class.findById(cid);
          if (!cls) return res.status(400).json({ error: `Class ${cid} not found` });
        }
      }
    } else if (data.role === 'ortu') {
      if (!data.nik) return res.status(400).json({ error: 'NIK required for parents' });
      const existingNik = await UserOrtu.findOne({ nik: data.nik });
      if (existingNik) return res.status(400).json({ error: 'NIK already registered' });
      if (data.children) {
        if (!Array.isArray(data.children)) return res.status(400).json({ error: 'children must be a list' });
        for (let childId of data.children) {
          if (!ObjectId.isValid(childId)) return res.status(400).json({ error: `Invalid child ID: ${childId}` });
          const student = await UserSiswa.findById(childId);
          if (!student) return res.status(400).json({ error: `Student ${childId} not found` });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    let newUser;
    if (data.role === 'siswa') {
      newUser = new UserSiswa({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        full_name: data.full_name,
        nis: data.nis,
        class_id: data.class_id,
        parent_id: data.parent_id || null,
        academic_year_id: data.academic_year_id,
        status: data.status || 'active',
        profile: { phone: data.phone, address: data.address }
      });
    } else if (data.role === 'guru') {
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
    } else if (data.role === 'ortu') {
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
    } else {
      newUser = new UserAdmin({
        email: data.email,
        username: data.username,
        password: hashedPassword,
        full_name: data.full_name,
        permissions: data.permissions || ['all'],
        is_active: true
      });
    }
    await newUser.save();
    const token = generateToken(newUser._id, newUser.email, newUser.username, data.role);
    res.status(201).json({
      message: `${data.role.charAt(0).toUpperCase() + data.role.slice(1)} registered successfully`,
      token,
      user: { id: newUser._id, email: newUser.email, username: newUser.username, full_name: newUser.full_name, role: data.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    let user = await findUserByEmail(email);
    if (!user) user = await findUserByUsername(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.role === 'siswa') {
      if (user.status !== 'active') return res.status(401).json({ error: 'Account is not active' });
    } else {
      if (user.is_active === false) return res.status(401).json({ error: 'Account is disabled' });
    }
    //  PERBAIKAN: urutan parameter (plainPassword, hashedPassword)
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = generateToken(user._id, user.email, user.username, user.role);
    // Hapus password dari object user sebelum dikirim ke client
    const { password: _, ...userWithoutPassword } = user;
    res.json({ message: 'Login successful', token, user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const user = await findUserById(userId, role);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.registerAdmin = async (req, res) => {
  try {
    const data = req.body;
    const required = ['email', 'username', 'password', 'full_name'];
    for (let f of required) if (!data[f]) return res.status(400).json({ error: `${f} is required` });
    data.role = 'admin';
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
    res.status(201).json({ message: 'Admin registered successfully', admin_id: admin._id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};