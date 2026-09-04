const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://ramndy14:Lms123456@cluster0.5wgzs.mongodb.net/LMS_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  const classes = await db.collection('classes').find({ name: /^8|VIII/ }).toArray();
  const classIds = classes.map(c => c._id);
  
  const schedules = await db.collection('schedules').find({ class_id: { $in: classIds } }).toArray();
  const teachers = await db.collection('users_guru').find({}).toArray();
  const subjects = await db.collection('subjects').find({}).toArray();
  
  let unassigned = 0;
  let hasTeacher = 0;
  
  schedules.forEach(s => {
    if (!s.teacher_id) unassigned++;
    else hasTeacher++;
  });
  
  console.log('Unassigned:', unassigned, 'Has Teacher:', hasTeacher);
  
  // also check if M (Muzayin) has any schedules in class 8
  const mTeacher = teachers.find(t => t.teacher_code === 'M');
  if (mTeacher) {
    const mSchedules = schedules.filter(s => s.teacher_id && s.teacher_id.toString() === mTeacher._id.toString());
    console.log('Schedules for M:', mSchedules.length);
  } else {
    console.log('Teacher M not found in DB');
  }
  
  process.exit(0);
});
