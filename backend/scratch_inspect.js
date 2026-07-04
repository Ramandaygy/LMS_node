const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to DB');
  const Subject = require('./models/Subject');
  const subjects = await Subject.find().lean();
  console.log('--- Subjects ---');
  console.log(JSON.stringify(subjects.map(s => ({ _id: s._id, name: s.name, code: s.code })), null, 2));

  const Grade = require('./models/Grade');
  const gradesCount = await Grade.countDocuments();
  console.log('--- Grades Count ---', gradesCount);

  if (gradesCount > 0) {
    const sampleGrades = await Grade.find().limit(5).populate('subject').lean();
    console.log('--- Sample Grades ---');
    console.log(JSON.stringify(sampleGrades, null, 2));
  }

  const Attendance = require('./models/Attendance');
  const attendanceCount = await Attendance.countDocuments();
  console.log('--- Attendance Count ---', attendanceCount);

  process.exit();
}).catch(err => {
  console.error(err);
  process.exit(1);
});
