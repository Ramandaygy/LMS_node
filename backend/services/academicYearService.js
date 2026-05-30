const AcademicYear =
  require('../models/AcademicYear');

exports.getAll = async () => {

  return await AcademicYear
    .find()
    .sort({
      created_at: -1
    });
};

exports.create = async (
  data
) => {

  if (data.is_active) {

    await AcademicYear.updateMany(
      {},
      {
        $set: {
          is_active: false
        }
      }
    );
  }

  return await AcademicYear.create(
    data
  );
};

exports.update = async (
  id,
  data
) => {

  if (data.is_active) {

    await AcademicYear.updateMany(
      {},
      {
        $set: {
          is_active: false
        }
      }
    );
  }

  return await AcademicYear.findByIdAndUpdate(
    id,
    data,
    {
      new: true
    }
  );
};

exports.delete = async (
  id
) => {

  return await AcademicYear.findByIdAndDelete(
    id
  );
};

exports.getCurrent =
  async () => {

    return await AcademicYear.findOne({
      is_active: true
    });
  };