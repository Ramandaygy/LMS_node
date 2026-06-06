const mongoose = require('mongoose');

const connectDB = async () => {
  try {

    console.log(
      'MONGO_URI exists:',
      !!process.env.MONGO_URI
    );

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      'MongoDB Connected'
    );

  } catch (error) {

    console.error(
      'Mongo Error:',
      error
    );

    throw error;
  }
};

module.exports = connectDB;