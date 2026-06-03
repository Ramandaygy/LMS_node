import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import { authService } from './services/auth';

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

// ============================================
// DASHBOARD PAGES
// ============================================
import AdminDashboard from './pages/dashboard/AdminDashboard';
import GuruDashboard from './pages/dashboard/GuruDashboard';
import SiswaDashboard from './pages/dashboard/SiswaDashboard';
import OrtuDashboard from './pages/dashboard/OrtuDashboard';

// ============================================
// ADMIN SUB PAGES
// ============================================
import AdminStudents from './pages/dashboard/admin/AdminStudents';
import AdminTeachers from './pages/dashboard/admin/AdminTeachers';
import AdminCourses from './pages/dashboard/admin/AdminCourses';
import AdminReports from './pages/dashboard/admin/AdminReports';
import AdminClasses from './pages/dashboard/admin/AdminClasses';
import AdminSubjects from './pages/dashboard/admin/AdminMapel';
import AdminAcademicYear from './pages/dashboard/admin/AdminAcademic';
import AdminSchedule from './pages/dashboard/admin/AdminSchedule';
import AdminDataMaster from './pages/dashboard/admin/AdminDataMaster';

// ============================================
// GURU SUB PAGES
// ============================================
import GuruCourses from './pages/dashboard/guru/GuruCourses';
import GuruAssignments from './pages/dashboard/guru/GuruAssignments';
import GuruMaterials from './pages/dashboard/guru/GuruMaterials';
import GuruAttendance from './pages/dashboard/guru/GuruAttendance';
import GuruMonitoring from './pages/dashboard/guru/GuruMonitoring';
import GuruStudents from './pages/dashboard/guru/GuruStudents';

// ============================================
// SISWA SUB PAGES
// ============================================
import SiswaAssignments from './pages/dashboard/siswa/SiswaAssignments';
import SiswaAttendance from './pages/dashboard/siswa/SiswaAttendance';

// ============================================
// ORTU SUB PAGES
// ============================================
import OrtuAttendance from './pages/dashboard/ortu/OrtuAttendance';
import OrtuMonitoring from './pages/dashboard/ortu/OrtuMonitoring';

// ============================================
// COMPONENTS
// ============================================
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';

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
  if (allowedRole && currentUser.role !== allowedRole) {
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
  const DashboardLayout = ({ children, role }) => {
    return (
      <div className="dashboard-container">
        <Sidebar
          role={role}
          activeMenu={activeMenu}
          onMenuChange={setActiveMenu}
        />

        <div className="main-content">
          {children}
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
            <PublicLayout>
              <LandingPage />
            </PublicLayout>
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
          element={<Navigate to="/login/siswa" replace />}
        />

        {/* ============================================ */}
        {/* REGISTER ROUTES */}
        {/* ============================================ */}

        <Route
          path="/register/siswa"
          element={
            <AuthLayout>
              <RegisterSiswa />
            </AuthLayout>
          }
        />

        <Route
          path="/register/guru"
          element={
            <AuthLayout>
              <RegisterGuru />
            </AuthLayout>
          }
        />

        <Route
          path="/register/ortu"
          element={
            <AuthLayout>
              <RegisterOrtu />
            </AuthLayout>
          }
        />

        <Route
          path="/register/admin"
          element={
            <AuthLayout>
              <RegisterAdmin />
            </AuthLayout>
          }
        />

        <Route
          path="/register"
          element={<Navigate to="/register/siswa" replace />}
        />

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

        {/* ============================================ */}
        {/* GURU DASHBOARD */}
        {/* ============================================ */}

        <Route
          path="/dashboard/guru"
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/courses"
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruCourses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/assignments"
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruAssignments />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/materials"
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruMaterials />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/guru/attendance"
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruAttendance />
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
          path="/dashboard/guru/students"
          element={
            <ProtectedRoute allowedRole="guru">
              <DashboardLayout role="guru">
                <GuruStudents />
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
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/students"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminStudents />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/teachers"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminTeachers />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/courses"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminCourses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/reports"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/classes"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminClasses />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/subjects"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminSubjects />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/academic-year"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminAcademicYear />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/schedule"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminSchedule />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard/admin/data-master"
          element={
            <ProtectedRoute allowedRole="admin">
              <DashboardLayout role="admin">
                <AdminDataMaster />
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