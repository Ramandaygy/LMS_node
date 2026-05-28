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

  switch (role) {

    case 'siswa':
      return await siswaCollection
        .find({})
        .toArray();

    case 'guru':
      return await guruCollection
        .find({})
        .toArray();

    case 'admin':
      return await adminCollection
        .find({})
        .toArray();

    case 'ortu':
      return await ortuCollection
        .find({})
        .toArray();

    default:
      return [];
  }
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
    await collection.insertOne(userData);

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