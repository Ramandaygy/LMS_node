const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://ramndy14:Lms123456@cluster0.5wgzs.mongodb.net/LMS_db?retryWrites=true&w=majority').then(async () => {
  const db = mongoose.connection.db;
  
  const classes = await db.collection('classes').find({ name: /^8|VIII/ }).toArray();
  const classIds = classes.map(c => c._id);
  const schedules = await db.collection('schedules').find({ class_id: { $in: classIds } }).toArray();
  console.log('Total schedules in class 8:', schedules.length);
  
  const teachers = await db.collection('users_guru').find({}).toArray();
  const istiqomah = teachers.find(t => t.teacher_code === 'O');
  
  if(istiqomah) {
    const isScheds = schedules.filter(s => s.teacher_id && s.teacher_id.toString() === istiqomah._id.toString());
    console.log('Istiqomah schedules:', isScheds.length);
  }
  process.exit(0);
});
