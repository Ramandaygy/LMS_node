require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');

const academicYearRoutes = require('./routes/academicYearRoutes');
const profileRoutes = require('./routes/profileRoutes');
const auth = require('./middleware/authMiddleware');

const app = express();

// =====================================
// MIDDLEWARE
// =====================================
app.use(cors());
app.options('*', cors());

// Fast-respond OPTIONS preflight requests immediately to prevent CORS 500 errors
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database Middleware Error:', err);
    res.status(500).json({ success: false, error: 'Database Connection Error', message: err.message });
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({
    limit: '10mb',
    extended: true,
  })
);

// =====================================
// STATIC FILES
// =====================================
app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

// =====================================
// ROUTES
// =====================================

// AUTH
app.use(
  '/api/auth',
  require('./routes/authRoutes')
);

// DASHBOARD
app.use(
  '/api/dashboard',
  require('./routes/dashboardRoutes')
);

// USERS
app.use(
  '/api/users',
  require('./routes/userRoutes')
);

// ADMIN EXPORT IMPORT
app.use(
  '/api/admin',
  require('./routes/exportImportRoutes')
);

// ADMIN MONITORING
app.use(
  '/api/admin/monitoring',
  require('./routes/adminMonitoringRoutes')
);

// CLASSES
app.use(
  '/api/classes',
  require('./routes/classRoutes')
);

// SUBJECTS
app.use(
  '/api/subjects',
  require('./routes/subjectRoutes')
);


// MATERIALS
app.use(
  '/api/materials',
  require('./routes/materialRoutes')
);

// ASSIGNMENTS
app.use(
  '/api/assignments',
  require('./routes/assignmentRoutes')
);


// ATTENDANCE
app.use(
  '/api/attendance',
  require('./routes/attendanceRoutes')
);

// GRADES
app.use(
  '/api/grades',
  require('./routes/gradeRoutes')
);

app.use(
  '/api/academic-years',
  require('./routes/academicYearRoutes')
);

// SCHEDULES
app.use(
  '/api/schedules',
  require('./routes/scheduleRoutes')
);

// CBT EXAMS
app.use(
  '/api/cbt',
  require('./routes/cbtRoutes')
);

// SETTINGS
app.use(
  '/api/settings',
  require('./routes/settingRoutes')
);

app.use('/api/profile',
  require('./routes/profileRoutes') 
);

// PROGRESS
app.use('/api/progress', require('./routes/progressRoutes'));

// EVENTS / CALENDAR
app.use('/api/events', require('./routes/eventRoutes'));

// PUSH NOTIFICATIONS
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.use('/api/guru/attendance', require('./routes/attendanceRoutes'));
app.use('/api/guru', require('./routes/guruRoutes'));

// =====================================
// ROOT TEST
// =====================================
app.get('/', (req, res) => {

  return res.json({
    success: true,
    message:
      'LMS Backend Running',
  });
});

// =====================================
// ERROR HANDLER
// =====================================
app.use((err, req, res, next) => {

  console.error(err.stack);

  return res.status(500).json({
    success: false,
    message:
      'Internal Server Error',
  });
});

// =====================================
// SERVER
// =====================================
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT}`
    );
  });
}

module.exports = app;