import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-student-detail.css';

const AdminStudentDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [gradesHistory, setGradesHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedYear, setSelectedYear] = useState('all');
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  // Kirim event ke sidebar untuk menjaga menu aktif
  useEffect(() => {
    const event = new CustomEvent('sidebarMenuChange', {
      detail: { menu: 'data-master' }
    });
    window.dispatchEvent(event);
  }, []);

  useEffect(() => {
    fetchStudentDetail();
    fetchSubjects();
    fetchAcademicYears();
  }, [studentId]);

  const fetchSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      setAvailableSubjects(res.data.data || res.data.subjects || []);
    } catch (err) {
      console.error('Error fetching subjects:', err);
      setAvailableSubjects([]);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const res = await api.get('/academic-years');
      const years = res.data.academic_years || [];
      setAcademicYears(years);
      if (years.length > 0) {
        const active = years.find(y => y.is_active);
        setSelectedYear(active?._id || years[0]._id);
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setAcademicYears([]);
    }
  };

  const fetchStudentDetail = async () => {
    setLoading(true);
    setError('');
    try {
      // Gunakan endpoint baru: /users/students/:id/detail
      const studentRes = await api.get(`/users/students/${studentId}/detail`);
      const studentData = studentRes.data.data || studentRes.data;
      setStudent(studentData);
      await fetchStudentGrades(studentData);
    } catch (err) {
      console.error('Error fetching student detail:', err);
      // Fallback ke endpoint lama
      try {
        const fallbackRes = await api.get(`/users/${studentId}`);
        const fallbackData = fallbackRes.data.data || fallbackRes.data;

        let parentData = null;
        if (fallbackData.parent_id) {
          try {
            const parentRes = await api.get(`/users/${fallbackData.parent_id}`);
            parentData = parentRes.data.data || parentRes.data;
          } catch (e) {
            console.log('Parent not found');
          }
        }

        setStudent({
          ...fallbackData,
          parent: parentData || null,
          class_name: fallbackData.class_name || fallbackData.class_id?.name || 'Belum Diatur',
          parent_name: parentData?.full_name || fallbackData.parent_name || 'Belum dihubungkan',
          parent_phone: parentData?.phone || fallbackData.parent_phone || 'Belum ada',
          parent_job: parentData?.pekerjaan || fallbackData.pekerjaan_ortu || '-'
        });
      } catch (fallbackErr) {
        setError('Gagal memuat data siswa');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentGrades = async (studentData) => {
    try {
      const gradesRes = await api.get(`/grades/student/${studentId}/history`);
      let grades = gradesRes.data.data || gradesRes.data.grades || [];

      // Filter berdasarkan tahun ajaran
      let filteredGrades = grades;
      if (selectedYear !== 'all') {
        const selectedYearData = academicYears.find(y => y._id === selectedYear);
        if (selectedYearData) {
          filteredGrades = grades.filter(g =>
            g.academic_year === selectedYearData.year ||
            g.academic_year_id === selectedYear
          );
        }
      }

      if (filteredGrades.length === 0 && availableSubjects.length > 0) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentSemester = currentMonth >= 6 ? 'Ganjil' : 'Genap';
        const activeYear = academicYears.find(y => y.is_active);
        const yearLabel = activeYear ? `${activeYear.year}` : `${currentYear}/${currentYear + 1}`;

        const dummyGrades = availableSubjects.map(sub => ({
          academic_year: yearLabel,
          semester: currentSemester,
          subject_name: sub.name,
          subject_id: sub._id,
          t1: '-',
          t2: '-',
          t3: '-',
          avg_tugas: '-',
          uts: '-',
          uas: '-',
          nilai_akhir: '-',
          is_empty: true
        }));
        setGradesHistory(dummyGrades);
      } else {
        setGradesHistory(filteredGrades);
      }
    } catch (err) {
      console.error('Error fetching grades:', err);
      if (availableSubjects.length > 0) {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const currentSemester = currentMonth >= 6 ? 'Ganjil' : 'Genap';
        const activeYear = academicYears.find(y => y.is_active);
        const yearLabel = activeYear ? `${activeYear.year}` : `${currentYear}/${currentYear + 1}`;

        const dummyGrades = availableSubjects.map(sub => ({
          academic_year: yearLabel,
          semester: currentSemester,
          subject_name: sub.name,
          subject_id: sub._id,
          t1: '-',
          t2: '-',
          t3: '-',
          avg_tugas: '-',
          uts: '-',
          uas: '-',
          nilai_akhir: '-',
          is_empty: true
        }));
        setGradesHistory(dummyGrades);
      } else {
        setGradesHistory([]);
      }
    }
  };

  // Refresh grades saat tahun ajaran berubah
  useEffect(() => {
    if (student) {
      fetchStudentGrades(student);
    }
  }, [selectedYear]);

  const groupedGrades = () => {
    const groups = {};
    gradesHistory.forEach(g => {
      const key = `${g.academic_year || g.tahun || 'Unknown'}_${g.semester || 'Unknown'}`;
      if (!groups[key]) {
        groups[key] = {
          academic_year: g.academic_year || g.tahun || 'Unknown',
          semester: g.semester || 'Unknown',
          subjects: []
        };
      }
      groups[key].subjects.push(g);
    });
    return Object.values(groups);
  };

  const groupedData = groupedGrades();
  const filteredData = groupedData;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (err) {
      return '-';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (err) {
      return '-';
    }
  };

  if (loading) {
    return (
      <div className="student-detail-loading">
        <div className="loading-spinner"></div>
        <p>Memuat data siswa...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="student-detail-error">
        <span className="material-symbols-outlined">error</span>
        <p>{error || 'Data siswa tidak ditemukan'}</p>
        <button onClick={() => navigate('/dashboard/admin/students')} className="btn-back">
          Kembali ke Daftar Siswa
        </button>
      </div>
    );
  }

  // Ambil data dengan fallback yang benar
  const className = student.class_name || student.class_id?.name || 'Belum Diatur';
  const parentName = student.parent_name || student.parent?.full_name || 'Belum dihubungkan';
  const parentPhone = student.parent_phone || student.parent?.phone || 'Belum ada';
  const parentJob = student.parent_job || student.parent?.pekerjaan || '-';
  const parentEmail = student.parent_email || student.parent?.email || '-';
  const studentNis = student.nis || '-';
  const studentNisn = student.nisn || '-';
  const studentGender = student.jenis_kelamin || student.gender || '-';
  const studentEmail = student.email || '-';
  const studentUsername = student.username || student.nis || '-';
  const studentAlamat = student.alamat || student.address || 'Belum diisi';
  const studentPhone = student.phone || '-';
  const studentTempatLahir = student.tempat_lahir || '-';
  const studentTanggalLahir = student.tanggal_lahir ? formatDate(student.tanggal_lahir) : '-';
  const studentCreatedAt = student.createdAt ? formatDateTime(student.createdAt) :
    student.created_at ? formatDateTime(student.created_at) : '-';
  const studentStatus = student.is_active !== false;

  return (
    <div className="student-detail-page">
      <div className="student-detail-header">
        <div className="header-top-row">
          <button onClick={() => navigate('/dashboard/admin/students')} className="btn-back-header">
            <span className="material-symbols-outlined">arrow_back</span>
            Kembali ke Daftar Siswa
          </button>
        </div>
        <div className="student-header-info">
          <div className="student-avatar-large">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div>
            <h1 className="student-name">{student.full_name || 'Nama Tidak Diketahui'}</h1>
            <div className="student-badges">
              <span className="badge-nis">NIS: {studentNis}</span>
              <span className={`badge-status ${studentStatus ? 'active' : 'inactive'}`}>
                {studentStatus ? '● Aktif' : '○ Nonaktif'}
              </span>
              <span className="badge-class">{className}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="student-detail-body">
        <div className="detail-grid">
          <div className="detail-card">
            <h4 className="card-title">
              <span className="material-symbols-outlined">person</span>
              Informasi Siswa
            </h4>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Email Akademik</span>
                <span className="info-value">{studentEmail}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Username Login</span>
                <span className="info-value">{studentUsername}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Jenis Kelamin</span>
                <span className="info-value">
                  {studentGender === 'Laki-laki' ? 'Laki-laki' :
                    studentGender === 'Perempuan' ? 'Perempuan' : '-'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Tempat, Tanggal Lahir</span>
                <span className="info-value">{studentTempatLahir}, {studentTanggalLahir}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Alamat Tempat Tinggal</span>
                <span className="info-value">{studentAlamat}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Nomor Telepon</span>
                <span className="info-value">{studentPhone}</span>
              </div>
              <div className="info-row">
                <span className="info-label">NISN</span>
                <span className="info-value">{studentNisn}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Tanggal Terdaftar</span>
                <span className="info-value">{studentCreatedAt}</span>
              </div>
            </div>
          </div>

          <div className="detail-card">
            <h4 className="card-title">
              <span className="material-symbols-outlined">family_restroom</span>
              Data Wali Murid
            </h4>
            <div className="card-content">
              <div className="info-row">
                <span className="info-label">Nama Orang Tua / Wali</span>
                <span className="info-value">{parentName}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Nomor Telepon Ortu</span>
                <span className="info-value">{parentPhone}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email Orang Tua</span>
                <span className="info-value">{parentEmail}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Pekerjaan Orang Tua</span>
                <span className="info-value">{parentJob}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="detail-card full-width">
          <div className="grades-header">
            <div className="grades-header-left">
              <h4 className="card-title" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0 }}>
                <span className="material-symbols-outlined">history</span>
                Riwayat Nilai per Semester
              </h4>
            </div>
            <div className="grades-filters">
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="year-filter-select"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#0f172a',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="all">Semua Tahun Ajaran</option>
                {academicYears.map(year => (
                  <option key={year._id} value={year._id}>
                    {year.year} - {year.semester || ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="empty-grades">
              <span className="material-symbols-outlined">receipt_long</span>
              <p>Belum ada data nilai untuk periode yang dipilih.</p>
            </div>
          ) : (
            filteredData.map((group, idx) => (
              <div key={idx} className="semester-group">
                <div className="semester-header">
                  <span className="semester-badge">
                    📚 {group.academic_year} - {group.semester}
                  </span>
                  <span className="subject-count">{group.subjects.length} Mata Pelajaran</span>
                </div>
                <div className="grades-table-wrapper">
                  <table className="grades-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Mata Pelajaran</th>
                        <th className="text-center">T1</th>
                        <th className="text-center">T2</th>
                        <th className="text-center">T3</th>
                        <th className="text-center">Rata-rata</th>
                        <th className="text-center">UTS</th>
                        <th className="text-center">UAS</th>
                        <th className="text-center">Nilai Akhir</th>
                        <th className="text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.subjects.map((grade, gIdx) => {
                        const nilaiAkhir = grade.nilai_akhir || grade.nilai || grade.nilai_akhir_semester || '-';
                        const isPass = nilaiAkhir !== '-' && Number(nilaiAkhir) >= 75;
                        const isEmpty = grade.is_empty === true;

                        return (
                          <tr key={gIdx} className={isEmpty ? 'empty-row' : ''}>
                            <td>{gIdx + 1}</td>
                            <td className="subject-name">{grade.subject_name || grade.subject || grade.mapel || '-'}</td>
                            <td className="text-center">{grade.t1 !== undefined && grade.t1 !== null && grade.t1 !== '' ? grade.t1 : '-'}</td>
                            <td className="text-center">{grade.t2 !== undefined && grade.t2 !== null && grade.t2 !== '' ? grade.t2 : '-'}</td>
                            <td className="text-center">{grade.t3 !== undefined && grade.t3 !== null && grade.t3 !== '' ? grade.t3 : '-'}</td>
                            <td className="text-center avg-score">{grade.avg_tugas || grade.rata_tugas || grade.rata_rata || '-'}</td>
                            <td className="text-center">{grade.uts !== undefined && grade.uts !== null && grade.uts !== '' ? grade.uts : '-'}</td>
                            <td className="text-center">{grade.uas !== undefined && grade.uas !== null && grade.uas !== '' ? grade.uas : '-'}</td>
                            <td className={`text-center final-score ${!isEmpty && isPass ? 'pass' : !isEmpty && !isPass && nilaiAkhir !== '-' ? 'fail' : ''}`}>
                              {nilaiAkhir}
                            </td>
                            <td className="text-center">
                              {isEmpty ? (
                                <span className="status-badge-grade empty">⏳ Belum diisi</span>
                              ) : isPass ? (
                                <span className="status-badge-grade pass">✅ Tuntas</span>
                              ) : nilaiAkhir !== '-' ? (
                                <span className="status-badge-grade fail">❌ Belum Tuntas</span>
                              ) : (
                                <span className="status-badge-grade empty">⏳ Belum diisi</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudentDetail;