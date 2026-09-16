import React, { useState, useEffect, lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { authService } from './services/auth';
import { pushNotificationService } from './services/pushNotificationService';

// ============================================
// STYLES
// ============================================
import './styles/global.css';
import './App.css';

// ============================================
// PUBLIC PAGES
// ============================================
import LandingPage from './pages/LandingPage';
import Tentang from './pages/Tentang';
import Kursus from './pages/Kursus';
import Kontak from './pages/Kontak';

// ============================================
// PROFILE
// ============================================
import Profile from './pages/profile/Profile';

// ============================================
// AUTH PAGES
// ============================================
import LoginSiswa from './pages/auth/LoginSiswa';
import LoginGuru from './pages/auth/LoginGuru';
import LoginOrtu from './pages/auth/LoginOrtu';
import LoginAdmin from './pages/auth/LoginAdmin';

import RegisterSiswa from './pages/auth/RegisterSiswa';
import RegisterGuru from './pages/auth/RegisterGuru';
import RegisterOrtu from './pages/auth/RegisterOrtu';
import RegisterAdmin from './pages/auth/RegisterAdmin';
import ForgotPassword from './pages/auth/ForgotPassword';

// ============================================
// DASHBOARD PAGES
// ============================================
import AdminDashboard from './pages/dashboard/AdminDashboard';
import GuruDashboard from './pages/dashboard/GuruDashboard';
import SiswaDashboard from './pages/dashboard/SiswaDashboard';
import OrtuDashboard from './pages/dashboard/OrtuDashboard';
import BkAttendance from './pages/dashboard/bk/BkAttendance';
import BkMainDashboard from './pages/dashboard/bk/BkMainDashboard';

import CalendarInfo from './pages/dashboard/shared/CalendarInfo';

import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

// ============================================
// ADMIN SUB PAGES
// ============================================
// Lazy-loaded admin pages for code splitting
const AdminDataMaster = lazy(() => import('./pages/dashboard/admin/AdminDataMaster'));
const AdminStudents = lazy(() => import('./pages/dashboard/admin/AdminStudents'));
const AdminTeachers = lazy(() => import('./pages/dashboard/admin/AdminTeachers'));
const AdminParents = lazy(() => import('./pages/dashboard/admin/AdminParents'));
const AdminReports = lazy(() => import('./pages/dashboard/admin/AdminReports'));
const AdminClasses = lazy(() => import('./pages/dashboard/admin/AdminClasses'));
const AdminSubjects = lazy(() => import('./pages/dashboard/admin/AdminMapel'));
const AdminAcademicYear = lazy(() => import('./pages/dashboard/admin/AdminAcademic'));
const AdminSchedule = lazy(() => import('./pages/dashboard/admin/AdminSchedule'));
const AdminMonitoring = lazy(() => import('./pages/dashboard/admin/AdminMonitoring'));
const AdminSettings = lazy(() => import('./pages/dashboard/admin/AdminSettings'));
const AdminGradeSettings = lazy(() => import('./pages/dashboard/admin/AdminGradeSettings'));
const AdminGradeInputPeriods = lazy(() => import('./pages/dashboard/admin/GradeInputPeriods'));
const AdminGradeInputPeriodDetail = lazy(() => import('./pages/dashboard/admin/GradeInputPeriodDetail'));
const AdminStudentDetail = lazy(() => import('./pages/dashboard/admin/AdminStudentDetail'));
const SuperAdminAccounts = lazy(() => import('./pages/dashboard/admin/SuperAdminAccounts'));
const SuperAdminRoles = lazy(() => import('./pages/dashboard/admin/SuperAdminRoles'));
const SuperAdminSettings = lazy(() => import('./pages/dashboard/admin/SuperAdminSettings'));
const SuperAdminActivityLogs = lazy(() => import('./pages/dashboard/admin/SuperAdminActivityLogs'));
const SuperAdminBackup = lazy(() => import('./pages/dashboard/admin/SuperAdminBackup'));


// ============================================
// GURU SUB PAGES
// ============================================
// Lazy-loaded guru pages for code splitting (heavy components)
const GuruClassroom = lazy(() => import('./pages/dashboard/guru/GuruClassroom'));
const GuruAssignments = lazy(() => import('./pages/dashboard/guru/GuruAssignments'));
const GuruMaterials = lazy(() => import('./pages/dashboard/guru/GuruMaterials'));
const GuruAttendance = lazy(() => import('./pages/dashboard/guru/GuruAttendance'));
const GuruMonitoring = lazy(() => import('./pages/dashboard/guru/GuruMonitoring'));
const GuruStudents = lazy(() => import('./pages/dashboard/guru/GuruStudents'));
const GuruProgress = lazy(() => import('./pages/dashboard/guru/GuruProgress'));
const GuruQuiz = lazy(() => import('./pages/dashboard/guru/GuruQuiz'));
const GuruCbt = lazy(() => import('./pages/dashboard/guru/GuruCbt'));
const GuruInputNilai = lazy(() => import('./pages/dashboard/guru/GuruInputNilai'));
const GuruWaliKelas = lazy(() => import('./pages/dashboard/guru/GuruWaliKelas'));

// ============================================
// SISWA SUB PAGES
// ============================================
// Lazy-loaded siswa pages
const SiswaAssignments = lazy(() => import('./pages/dashboard/siswa/SiswaAssignments'));
const SiswaAttendance = lazy(() => import('./pages/dashboard/siswa/SiswaAttendance'));
const SiswaMaterials = lazy(() => import('./pages/dashboard/siswa/SiswaMaterials'));
const SiswaProgress = lazy(() => import('./pages/dashboard/siswa/SiswaProgress'));
const SiswaSchedule = lazy(() => import('./pages/dashboard/siswa/SiswaSchedule'));
const SiswaCbt = lazy(() => import('./pages/dashboard/siswa/SiswaCbt'));
const SiswaQuiz = lazy(() => import('./pages/dashboard/siswa/SiswaQuiz'));

// ============================================
// ORTU SUB PAGES
// ============================================
// Lazy-loaded ortu pages
const OrtuAttendance = lazy(() => import('./pages/dashboard/ortu/OrtuAttendance'));
const OrtuMonitoring = lazy(() => import('./pages/dashboard/ortu/OrtuMonitoring'));
const OrtuChildren = lazy(() => import('./pages/dashboard/ortu/OrtuChildren'));
const OrtuReports = lazy(() => import('./pages/dashboard/ortu/OrtuReports'));
const OrtuSchedule = lazy(() => import('./pages/dashboard/ortu/OrtuSchedule'));


// ============================================
// PROTECTED ROUTE
// ============================================
const ProtectedRoute = ({ children, allowedRole }) => {
  const currentUser = authService.getCurrentUser();

  console.log(' ProtectedRoute User:', currentUser);

  // Belum login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Token hilang
  if (!authService.getToken()) {
    authService.logout();
    return <Navigate to="/login" replace />;
  }

  // Role tidak sesuai
  const isAllowed = Array.isArray(allowedRole)
    ? allowedRole.includes(currentUser.role)
    : currentUser.role === allowedRole;

  if (allowedRole && !isAllowed) {
    return (
      <Navigate
        to={`/dashboard/${currentUser.role}`}
        replace
      />
    );
  }

  // Valid
  return children;
};

// ============================================
// REDIRECT DASHBOARD
// ============================================
const DashboardRedirect = () => {
  const currentUser = authService.getCurrentUser();

  if (currentUser && currentUser.role) {
    return (
      <Navigate
        to={`/dashboard/${currentUser.role}`}
        replace
      />
    );
  }

  return <Navigate to="/login" replace />;
};

function App() {

  // ============================================
  // STATE
  // ============================================
  const [activeMenu, setActiveMenu] = useState('dashboard');

  // ============================================
  // USER
  // ============================================
  const currentUser = authService.getCurrentUser();

  // ============================================
  // DEBUG
  // ============================================
  useEffect(() => {
    console.log(' App Current User:', currentUser);
  }, [currentUser]);

  // ============================================
  // LOGOUT
  // ============================================
  const handleLogout = () => {
    authService.logout();

    // Hard refresh supaya state reset total
    window.location.href = '/login';
  };

  // ============================================
  // DASHBOARD LAYOUT
  // ============================================
  // App.jsx
  const DashboardLayout = ({ children, role }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    // Initialize Push Notifications
    useEffect(() => {
      pushNotificationService.subscribe();
    }, []);

    return (
      <div className="dashboard-container">
        {/* Tombol hamburger - hanya tampil di mobile (CSS atur display) */}
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <span className="material-symbols-outlined">menu</span>
        </button>
        {sidebarOpen && (
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
        )}
        <Sidebar
          role={role}
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <div className="main-content">
          <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: '16px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#0284c7', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>Memuat halaman...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          }>
            {children}
          </Suspense>
        </div>
      </div>
    );
  };

  // ============================================
  // PUBLIC LAYOUT
  // ============================================
  const PublicLayout = ({ children }) => {
    return (
      <>
        <Navbar
          user={currentUser}
          onLogout={handleLogout}
        />

        {children}
      </>
    );
  };

  // ============================================
  // AUTH LAYOUT
  // ============================================
  const AuthLayout = ({ children }) => {
    return <>{children}</>;
  };

  // ============================================
  // ROUTES
  // ============================================
  return (
    <Router>
      <Routes>

        {/* ============================================ */}
        {/* PUBLIC ROUTES */}
        {/* ============================================ */}

        <Route
          path="/"
          element={
            currentUser ? (
              <DashboardRedirect />
            ) : (
              <PublicLayout>
                <LandingPage />
              </PublicLayout>
            )
          }
        />

        <Route
          path="/tentang"
          element={
            <PublicLayout>
              <Tentang />
            </PublicLayout>
          }
        />

        <Route
          path="/kursus"
          element={
            <PublicLayout>
              <Kursus />
            </PublicLayout>
          }
        />

        <Route
          path="/kontak"
          element={
            <PublicLayout>
              <Kontak />
            </PublicLayout>
          }
        />

        {/* ============================================ */}
        {/* LOGIN ROUTES */}
        {/* ============================================ */}

        <Route
          path="/login/siswa"
          element={
            <AuthLayout>
              <LoginSiswa />
            </AuthLayout>
          }
        />

        <Route
          path="/login/guru"
          element={
            <AuthLayout>
              <LoginGuru />
            </AuthLayout>
          }
        />

        <Route
          path="/login/ortu"
          element={
            <AuthLayout>
              <LoginOrtu />
            </AuthLayout>
          }
        />

        <Route
          path="/login/admin"
          element={
            <AuthLayout>
              <LoginAdmin />
            </AuthLayout>
          }
        />

        <Route
          path="/login"
          element={<Navigate to={`/login/${localStorage.getItem('lastRole') || 'siswa'}`} replace />}
        />

        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
        />

        {/* ============================================ */}
        {/* REGISTER ROUTES - REDIRECTED TO LOGIN (CLOSED SYSTEM) */}
        {/* ============================================ */}
        <Route path="/register/*" element={<Navigate to="/login" replace />} />



        {/* ============================================ */}
        {/* SISWA DASHBOARD */}
        {/* ============================================ */}

        <Route
          path="/dashboard/siswa"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/assignments"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaAssignments />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/attendance" element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          } />

        <Route
          path="/dashboard/siswa/materials"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaMaterials />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/progress"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaProgress />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/schedule"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaSchedule />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/cbt"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaCbt />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/quiz"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <SiswaQuiz />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/siswa/calendar"
          element={
            <ProtectedRoute allowedRole="siswa">
              <DashboardLayout role="siswa">
                <CalendarInfo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* GURU DASHBOARD */}
        {/* ============================================ */}

        <Route
          path="/dashboard/guru"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/courses"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruClassroom />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/walikelas"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruWaliKelas />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/assignments"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruAssignments />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/materials"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruMaterials />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/attendance"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/input-nilai"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruInputNilai />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/monitoring"
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/progress"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruProgress />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/students"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruStudents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/quiz"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruQuiz />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/cbt"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <GuruCbt />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/calendar"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <CalendarInfo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* BK DASHBOARD */}
        {/* ============================================ */}
        <Route
          path="/dashboard/bk"
          element={
            <ProtectedRoute allowedRole="bk">
              <DashboardLayout role="bk">
                <BkMainDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/bk/attendance"
          element={
            <ProtectedRoute allowedRole="bk">
              <DashboardLayout role="bk">
                <BkAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/bk/monitoring"
          element={
            <ProtectedRoute allowedRole="bk">
              <DashboardLayout role="bk">
                <AdminMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* ADMIN DASHBOARD */}
        {/* ============================================ */}

        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/data-master"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminDataMaster />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/students"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminStudents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/teachers"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminTeachers />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        <Route
          path="/dashboard/admin/reports"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/grade-settings"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminGradeSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/classes"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminClasses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/subjects"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminSubjects />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/academic-year"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminAcademicYear />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/schedule"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminSchedule />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/students"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminStudents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/teachers"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminTeachers />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin/parents"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminParents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/settings"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/grade-settings"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminGradeSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/grade-input-periods"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminGradeInputPeriods />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/grade-input-periods/:id"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminGradeInputPeriodDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/accounts"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminAccounts />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/roles"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminRoles />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/settings"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminSettings />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/activity-logs"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminActivityLogs />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/superadmin/backup"
          element={
            <ProtectedRoute allowedRole="super_admin">
              <DashboardLayout role="super_admin">
                <SuperAdminBackup />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/students/:studentId"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminStudentDetail />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/monitoring"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/leger"
          element={
            <ProtectedRoute allowedRole={['guru', 'super_admin', 'wakil_kurikulum', 'bk']}>
              <DashboardLayout role="guru">
                <AdminMonitoring />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/parents"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <AdminParents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/calendar"
          element={
            <ProtectedRoute allowedRole={['admin', 'super_admin', 'wakil_kurikulum']}>
              <DashboardLayout role="admin">
                <CalendarInfo />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* ORTU DASHBOARD */}
        {/* ============================================ */}

        <Route
          path="/dashboard/ortu"
          element={
            <ProtectedRoute allowedRole="ortu">
              <DashboardLayout role="ortu">
                <OrtuDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/ortu/attendance" element={
            <ProtectedRoute allowedRole="ortu">
              <DashboardLayout role="ortu">
                <OrtuAttendance />
              </DashboardLayout>
            </ProtectedRoute>
          } />

        <Route path="/dashboard/ortu/monitoring" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuMonitoring />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/children" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuChildren />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/reports" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuReports />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/schedule" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <OrtuSchedule />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        <Route path="/dashboard/ortu/calendar" element={
          <ProtectedRoute allowedRole="ortu">
            <DashboardLayout role="ortu">
              <CalendarInfo />
            </DashboardLayout>
          </ProtectedRoute>
        } />

        {/* ============================================ */}
        {/* PROFILE */}
        {/* ============================================ */}

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout role={currentUser?.role}>
                <Profile />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================================ */}
        {/* DASHBOARD REDIRECT */}
        {/* ============================================ */}

        <Route
          path="/dashboard"
          element={<DashboardRedirect />}
        />

        {/* ============================================ */}
        {/* NOT FOUND */}
        {/* ============================================ */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </Router>
  );
}

export default App;
