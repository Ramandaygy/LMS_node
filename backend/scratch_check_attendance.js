const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const Attendance = mongoose.connection.collection('attendances');
  const count = await Attendance.countDocuments();
  console.log('Total attendance records:', count);
  
  const sample = await Attendance.find().limit(5).toArray();
  console.log('Sample records:', sample);
  
  const schedules = await mongoose.connection.collection('schedules').find().toArray();
  console.log('Schedules count:', schedules.length);
  
  mongoose.disconnect();
}

run();
