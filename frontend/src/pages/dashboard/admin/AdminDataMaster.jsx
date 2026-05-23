// src/pages/dashboard/admin/AdminDataMaster.jsx
import React, { useState } from 'react';
import AdminStudents from './AdminStudents';
import AdminTeachers from './AdminTeachers';
import AdminSubjects from './AdminMapel';
import AdminClasses from './AdminClasses';
import '../../../styles/dashboard/admin/admin-data-master.css';

const AdminDataMaster = () => {
  const [activeTab, setActiveTab] = useState('students');

  const tabs = [
    { key: 'students', label: 'Siswa', component: <AdminStudents /> },
    { key: 'teachers', label: 'Guru', component: <AdminTeachers /> },
    { key: 'subjects', label: 'Mata Pelajaran', component: <AdminSubjects /> },
    { key: 'classes', label: 'Kelas', component: <AdminClasses /> },
  ];

  return (
    <div className="admin-data-master-container">
      <div className="admin-data-master-header">
        <h2>Data Master</h2>
        <p>Kelola data siswa, guru, mata pelajaran, dan kelas</p>
      </div>
      <div className="admin-data-master-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="admin-data-master-content">
        {tabs.find(tab => tab.key === activeTab)?.component}
      </div>
    </div>
  );
};

export default AdminDataMaster;