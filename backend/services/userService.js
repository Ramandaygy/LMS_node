const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ======================================
// COLLECTION REFERENCES
// ======================================

const siswaCollection =
  mongoose.connection.collection(
    'users_siswa'
  );

const guruCollection =
  mongoose.connection.collection(
    'users_guru'
  );

const adminCollection =
  mongoose.connection.collection(
    'users_admin'
  );

const ortuCollection =
  mongoose.connection.collection(
    'users_ortu'
  );

// ======================================
// MASTER COLLECTIONS
// ======================================

const subjectCollection =
  mongoose.connection.collection(
    'subjects'
  );

const classCollection =
  mongoose.connection.collection(
    'classes'
  );

// ======================================
// GET ALL USERS
// ======================================

exports.getAllUsers = async () => {

  const siswa =
    await siswaCollection.find({}).toArray();

  const guru =
    await guruCollection.find({}).toArray();

  const admin =
    await adminCollection.find({}).toArray();

  const ortu =
    await ortuCollection.find({}).toArray();

  return [
    ...siswa,
    ...guru,
    ...admin,
    ...ortu
  ];
};

// ======================================
// GET USER BY ID
// ======================================

exports.getUserById = async (id) => {

  const objectId =
    new mongoose.Types.ObjectId(id);

  let user =
    await siswaCollection.findOne({
      _id: objectId
    });

  if (!user) {
    user = await guruCollection.findOne({
      _id: objectId
    });
  }

  if (!user) {
    user = await adminCollection.findOne({
      _id: objectId
    });
  }

  if (!user) {
    user = await ortuCollection.findOne({
      _id: objectId
    });
  }

  return user;
};

// ======================================
// GET USERS BY ROLE
// ======================================

exports.getUsersByRole = async (role) => {

  let users = [];

  switch (role) {

    case 'siswa':
      users = await siswaCollection
        .find({})
        .toArray();
      break;

    case 'guru':
      users = await guruCollection
        .find({})
        .toArray();
      break;

    case 'admin':
      users = await adminCollection
        .find({})
        .toArray();
      break;

    case 'ortu':
      users = await ortuCollection
        .find({})
        .toArray();
      // Populate children (nama siswa)
      if (users.length) {
        // Kumpulkan semua childId
        const allChildIds = users.flatMap(u => u.children || []).map(id => id.toString());
        if (allChildIds.length) {
          const siswaCol = mongoose.connection.collection('users_siswa');
          const siswaList = await siswaCol.find({
            _id: { $in: allChildIds.map(id => new mongoose.Types.ObjectId(id)) }
          }).toArray();
          const siswaMap = new Map();
          siswaList.forEach(s => siswaMap.set(s._id.toString(), { _id: s._id, full_name: s.full_name, nis: s.nis }));
          // Ganti children array dengan object berisi full_name
          users = users.map(u => ({
            ...u,
            children: (u.children || []).map(childId => {
              const student = siswaMap.get(childId.toString());
              return student || childId; // fallback ke ID jika tidak ditemukan
            })
          }));
        }
      }
      break;

    default:
      return [];
  }

  // ======================================
  // GET MASTER DATA
  // ======================================

  const subjects =
    await subjectCollection
      .find({})
      .toArray();

  const classes =
    await classCollection
      .find({})
      .toArray();

  // ======================================
  // FORMAT DATA
  // ======================================

  return users.map(user => {

    // ======================================
    // MAP SUBJECTS (GURU)
    // ======================================

    let subjectNames = [];

    if (Array.isArray(user.subjects)) {

      subjectNames = user.subjects.map(id => {

        const subject = subjects.find(
          s =>
            s._id.toString() ===
            id.toString()
        );

        return subject?.name || '-';
      });
    }

    // ======================================
    // MAP CLASSES (GURU)
    // ======================================

    let classNames = [];

    if (Array.isArray(user.classes)) {

      classNames = user.classes.map(id => {

        const kelas = classes.find(
          c =>
            c._id.toString() ===
            id.toString()
        );

        return kelas?.name || '-';
      });
    }

    // ======================================
    // MAP CLASS (SISWA)
    // ======================================

    let className = '-';

    if (user.class_id) {

      const kelas = classes.find(
        c =>
          c._id.toString() ===
          user.class_id.toString()
      );

      className = kelas?.name || '-';
    }

    return {

      ...user,

      // ======================================
      // GURU
      // ======================================

      subjects: subjectNames,
      classes: classNames,

      // id asli untuk edit form
      subject_ids:
        Array.isArray(user.subjects)
          ? user.subjects
          : [],

      class_ids:
        Array.isArray(user.classes)
          ? user.classes
          : [],

      // ======================================
      // SISWA
      // ======================================

      class_name: className,

      // ======================================
      // STATUS
      // ======================================

      is_active:
        user.is_active !== undefined
          ? user.is_active
          : true,
    };
  });
};

// ======================================
// CREATE USER
// ======================================

exports.createUser = async (userData) => {

  let collection;

  switch (userData.role) {

    case 'siswa':
      collection = siswaCollection;
      break;

    case 'guru':
      collection = guruCollection;
      break;

    case 'admin':
      collection = adminCollection;
      break;

    case 'ortu':
      collection = ortuCollection;
      break;

    default:
      throw new Error('Role tidak valid');
  }

  if (userData.password) {
    userData.password = await bcrypt.hash(userData.password, 10);
  }

  if (userData.children && Array.isArray(userData.children)) {
    userData.children = userData.children.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        return id;
      }
    });
  }

  if (userData.class_id) {
    try {
      userData.class_id = new mongoose.Types.ObjectId(userData.class_id);
    } catch (err) {}
  }
  
  if (userData.parent_id) {
    try {
      userData.parent_id = new mongoose.Types.ObjectId(userData.parent_id);
    } catch (err) {}
  }

  const result =
    await collection.insertOne({

      ...userData,

      is_active:
        userData.is_active !== undefined
          ? userData.is_active
          : true,
    });

  return result;
};

// ======================================
// UPDATE USER
// ======================================

exports.updateUser = async (
  id,
  updateData
) => {

  const objectId =
    new mongoose.Types.ObjectId(id);

  const collections = [
    siswaCollection,
    guruCollection,
    adminCollection,
    ortuCollection
  ];

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  } else if (updateData.password === '') {
    // Jika dikirim string kosong, tidak perlu di-update
    delete updateData.password;
  }

  if (updateData.children && Array.isArray(updateData.children)) {
    updateData.children = updateData.children.map(id => {
      try {
        return new mongoose.Types.ObjectId(id);
      } catch (err) {
        return id;
      }
    });
  }

  if (updateData.class_id) {
    try {
      updateData.class_id = new mongoose.Types.ObjectId(updateData.class_id);
    } catch (err) {}
  }

  if (updateData.parent_id) {
    try {
      updateData.parent_id = new mongoose.Types.ObjectId(updateData.parent_id);
    } catch (err) {}
  }

  for (const collection of collections) {

    const user =
      await collection.findOne({
        _id: objectId
      });

    if (user) {

      await collection.updateOne(
        { _id: objectId },
        {
          $set: updateData
        }
      );

      return true;
    }
  }

  throw new Error('User tidak ditemukan');
};

// ======================================
// DELETE USER
// ======================================

exports.deleteUser = async (id) => {

  const objectId =
    new mongoose.Types.ObjectId(id);

  const collections = [
    siswaCollection,
    guruCollection,
    adminCollection,
    ortuCollection
  ];

  for (const collection of collections) {

    const user =
      await collection.findOne({
        _id: objectId
      });

    if (user) {

      await collection.deleteOne({
        _id: objectId
      });

      return true;
    }
  }

  throw new Error('User tidak ditemukan');
};