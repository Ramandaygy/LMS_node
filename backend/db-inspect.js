const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const User = require('./models/User');
  const Class = require('./models/Class');
  
  const gurus = await User.find({role: 'guru'});
  for (let guru of gurus) {
    const classes = await Class.find({homeroom_teacher: guru._id});
    if (classes.length > 0) {
      console.log('Guru:', guru.full_name);
      console.log('Classes:', classes.map(c => c._id));
      const classIds = classes.map(c => c._id);
      
      const studentCol = mongoose.connection.collection('users_siswa');
      const studentsInCol = await studentCol.find({ class_id: { $in: classIds } }).toArray();
      console.log('Students in users_siswa with ObjectId:', studentsInCol.length);

      const classIdStrings = classes.map(c => c._id.toString());
      const studentsInColStr = await studentCol.find({ class_id: { $in: classIdStrings } }).toArray();
      console.log('Students in users_siswa with String:', studentsInColStr.length);

      const usersFind = await User.find({ role: 'siswa', class_id: { $in: classIds } }).lean();
      console.log('Students in User.find:', usersFind.length);
      break;
    }
  }
  process.exit();
}).catch(console.error);
