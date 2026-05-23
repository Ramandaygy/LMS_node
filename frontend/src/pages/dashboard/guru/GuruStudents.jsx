import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-students.css';

const GuruStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);

  useEffect(() => {
    fetchMyStudents();
  }, []);

  const fetchMyStudents = async () => {
    try {
      const response = await api.get('/guru/students');
      const studentsData = response.data.students || [];
      // Ambil daftar kelas unik untuk filter dropdown
      const classSet = new Set(studentsData.map(s => s.class_name));
      const classList = Array.from(classSet).map(name => ({ name, value: name }));
      setAvailableClasses(classList);
      setStudents(studentsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching students:', error);
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          student.nis?.includes(searchTerm);
    const matchesClass = !selectedClass || student.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="guru-dashboard-content">
      <h2 className="page-title">👨‍🎓 Siswa Binaan</h2>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="Cari nama atau NIS..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">Semua Kelas</option>
          {availableClasses.map(cls => (
            <option key={cls.value} value={cls.value}>{cls.name}</option>
          ))}
        </select>
      </div>

      <div className="student-table-container">
        <table className="student-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>NIS</th>
              <th>Kelas</th>
              <th>Progress</th>
              <th>Rata-rata</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student._id}>
                <td>{student.full_name}</td>
                <td>{student.nis}</td>
                <td>{student.class_name}</td>
                <td>
                  <div className="progress-small">
                    <div className="progress-fill" style={{ width: `${student.progress || 0}%` }}></div>
                    <span>{student.progress || 0}%</span>
                  </div>
                </td>
                <td>{student.average_grade || '-'}</td>
                <td>
                  <button className="btn-detail">Detail</button>
                  <button className="btn-grade">Input Nilai</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GuruStudents;