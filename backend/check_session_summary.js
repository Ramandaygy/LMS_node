const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to DB');
  
  const targetSch = '6a6cf6a06b0ee329950dd861';
  const Attendance = mongoose.connection.collection('attendances');
  
  const records = await Attendance.find({ schedule_id: new mongoose.Types.ObjectId(targetSch) }).toArray();
  console.log('Records for target schedule:', records.length);
  if (records.length > 0) {
    console.log('Sample record for schedule:', records[0]);
  }
  
  const recordsStr = await Attendance.find({ schedule_id: targetSch }).toArray();
  console.log('Records for target schedule (string query):', recordsStr.length);

  mongoose.disconnect();
}

run();
