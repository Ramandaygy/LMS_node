const mongoose = require('mongoose');

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