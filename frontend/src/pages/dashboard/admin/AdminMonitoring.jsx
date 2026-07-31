import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { authService } from '../../../services/auth';
import '../../../styles/dashboard/admin/admin-students.css';
import '../../../styles/dashboard/admin/admin-reports.css';

const AdminMonitoring = () => {
  const currentUser = authService.getCurrentUser();
  const isGuru = currentUser?.role === 'guru';

  const [activeTab, setActiveTab] = useState('leger'); // 'leger' | 'students' | 'teachers' | 'activities'

  // Classes list
  const [classes, setClasses] = useState([]);

  // Leger State
  const [selectedLegerClass, setSelectedLegerClass] = useState('');
  const [selectedLegerSemester, setSelectedLegerSemester] = useState('Ganjil');
  const [legerViewMode, setLegerViewMode] = useState('vertical'); // 'vertical' | 'horizontal'
  const [legerData, setLegerData] = useState(null);
  const [loadingLeger, setLoadingLeger] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

  // Student State
  const [students, setStudents] = useState([]);
  const [studentStats, setStudentStats] = useState({
    total_students: 0,
    high_risk_count: 0,
    medium_risk_count: 0,
    low_risk_count: 0,
  });
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Selected Student Detail Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [loadingDetailModal, setLoadingDetailModal] = useState(false);

  // Teacher State
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Activity State
  const [activities, setActivities] = useState([]);
  const [activityTeacherSearch, setActivityTeacherSearch] = useState('');

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (classes.length > 0 && !selectedLegerClass) {
      setSelectedLegerClass(classes[0]._id);
    }
  }, [classes, selectedLegerClass]);

  useEffect(() => {
    if (activeTab === 'leger' && selectedLegerClass) {
      fetchLegerData();
    } else if (activeTab === 'students' && !isGuru) {
      fetchStudentsMonitoring();
    } else if (activeTab === 'teachers' && !isGuru) {
      fetchTeachersMonitoring();
    } else if (activeTab === 'activities' && !isGuru) {
      fetchTeacherActivities();
    }
  }, [activeTab, selectedLegerClass, studentSearch, selectedClassFilter, selectedRiskFilter, teacherSearch, activityTeacherSearch, isGuru]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      const classList = res.data.data || [];
      setClasses(classList);
      if (classList.length > 0) {
        setSelectedLegerClass(classList[0]._id);
      }
    } catch (e) {
      console.error('Error fetching classes:', e);
    }
  };

  const fetchLegerData = async () => {
    if (!selectedLegerClass) return;
    setLoadingLeger(true);
    try {
      const res = await api.get('/admin/monitoring/leger', { params: { class_id: selectedLegerClass } });
      setLegerData(res.data);
      setLoadingLeger(false);
    } catch (e) {
      console.error('Error fetching leger data:', e);
      setLoadingLeger(false);
    }
  };

  const handleExportLeger = async () => {
    if (!selectedLegerClass) return;
    setExportingExcel(true);
    try {
      const response = await api.get('/admin/monitoring/export-leger', {
        params: { class_id: selectedLegerClass, semester: selectedLegerSemester },
        responseType: 'blob',
      });

      const className = legerData?.class_info?.name || 'Kelas';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Leger_Nilai_${className.replace(/\s+/g, '_')}_Semester_${selectedLegerSemester}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportingExcel(false);
    } catch (e) {
      console.error('Error exporting leger excel:', e);
      alert('Gagal mengekspor file Excel Leger.');
      setExportingExcel(false);
    }
  };

  const fetchStudentsMonitoring = async () => {
    setLoadingStudents(true);
    try {
      const params = {};
      if (studentSearch) params.search = studentSearch;
      if (selectedClassFilter) params.class_id = selectedClassFilter;
      if (selectedRiskFilter) params.risk = selectedRiskFilter;

      const res = await api.get('/admin/monitoring/students', { params });
      setStudents(res.data.data || []);
      setStudentStats(res.data.stats || {});
      setLoadingStudents(false);
    } catch (e) {
      console.error('Error fetching student monitoring:', e);
      setLoadingStudents(false);
    }
  };

  const handleOpenStudentDetail = async (studentId) => {
    setLoadingDetailModal(true);
    try {
      const res = await api.get(`/admin/monitoring/students/${studentId}`);
      setSelectedStudentDetail(res.data);
    } catch (e) {
      console.error('Error fetching student detail:', e);
    } finally {
      setLoadingDetailModal(false);
    }
  };

  const fetchTeachersMonitoring = async () => {
    setLoadingTeachers(true);
    try {
      const params = {};
      if (teacherSearch) params.search = teacherSearch;
      const res = await api.get('/admin/monitoring/teachers', { params });
      setTeachers(res.data.data || []);
    } catch (e) {
      console.error('Error fetching teacher monitoring:', e);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchTeacherActivities = async () => {
    try {
      const params = {};
      if (activityTeacherSearch) params.teacher_name = activityTeacherSearch;
      const res = await api.get('/admin/monitoring/teacher-activities', { params });
      setActivities(res.data.logs || []);
    } catch (e) {
      console.error('Error fetching teacher activities:', e);
    }
  };

  return (
    <div className="admin-monitoring-page" style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#3b82f6' }}>monitoring</span>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>
            {isGuru ? 'Matriks Leger Nilai Sekolah' : 'Pusat Monitoring & Leger Nilai Sekolah'}
          </h1>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
          {isGuru
            ? 'Rekapitulasi Leger Nilai Akademik Seluruh Kelas (Formula 2:1:1) & Cetak Excel Leger.'
            : 'Rekapitulasi Leger Nilai Akademik (Formula 2:1:1), Monitoring EWS, Pemetaan Guru, dan Audit Log Aktivitas.'}
        </p>
      </div>

      {/* Main Tabs Navigation (For Admin shows 4 tabs, for Guru shows 1 tab) */}
      {!isGuru && (
        <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('leger')}
            style={{
              padding: '12px 24px',
              fontWeight: '700',
              fontSize: '15px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'leger' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'leger' ? '#2563eb' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>table_view</span>
            Matriks Leger Nilai Kelas (2:1:1)
          </button>

          <button
            onClick={() => setActiveTab('students')}
            style={{
              padding: '12px 24px',
              fontWeight: '700',
              fontSize: '15px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'students' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'students' ? '#2563eb' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>school</span>
            Monitoring Risiko Siswa (EWS)
          </button>

          <button
            onClick={() => setActiveTab('teachers')}
            style={{
              padding: '12px 24px',
              fontWeight: '700',
              fontSize: '15px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'teachers' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'teachers' ? '#2563eb' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>supervisor_account</span>
            Pemetaan Guru & Pengampuan
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            style={{
              padding: '12px 24px',
              fontWeight: '700',
              fontSize: '15px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === 'activities' ? '3px solid #3b82f6' : '3px solid transparent',
              color: activeTab === 'activities' ? '#2563eb' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
            Log Aktivitas Mengajar
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: MATRIKS LEGER NILAI KELAS (RUMUS 2 : 1 : 1)                        */}
      {/* ========================================================================= */}
      {activeTab === 'leger' && (
        <div>
          {/* Controls & Class Selector */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Pilih Kelas:</label>
                <select
                  value={selectedLegerClass}
                  onChange={(e) => setSelectedLegerClass(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', fontSize: '13px', outline: 'none' }}
                >
                  {classes.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontWeight: '700', color: '#0f172a', fontSize: '13px' }}>Semester Export:</label>
                <select
                  value={selectedLegerSemester}
                  onChange={(e) => setSelectedLegerSemester(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', fontSize: '13px', outline: 'none' }}
                >
                  <option value="Ganjil">Semester Ganjil</option>
                  <option value="Genap">Semester Genap</option>
                  <option value="Penuh">Tahun Ajaran Penuh (Ganjil + Genap)</option>
                </select>
              </div>

              <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => setLegerViewMode('vertical')}
                  style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', background: legerViewMode === 'vertical' ? '#0284c7' : 'transparent', color: legerViewMode === 'vertical' ? '#fff' : '#64748b', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>view_agenda</span> Layout Vertikal
                </button>
                <button
                  type="button"
                  onClick={() => setLegerViewMode('horizontal')}
                  style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', background: legerViewMode === 'horizontal' ? '#0284c7' : 'transparent', color: legerViewMode === 'horizontal' ? '#fff' : '#64748b', fontWeight: '800', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>table_chart</span> Tabel Horisontal
                </button>
              </div>
            </div>

            {legerData && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
                  Wali Kelas: <strong style={{ color: '#0f172a' }}>{legerData.class_info.homeroom_teacher}</strong>
                </div>
                <button
                  onClick={handleExportLeger}
                  disabled={exportingExcel}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>file_download</span>
                  {exportingExcel ? 'Mengunduh...' : `Cetak Excel Leger ${selectedLegerSemester} (.xlsx)`}
                </button>
              </div>
            )}
          </div>

          {/* Formula Callout Banner */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: '28px' }}>calculate</span>
            <div>
              <div style={{ fontWeight: '800', color: '#1e3a8a', fontSize: '14px' }}>Formula Nilai Akhir Rapor (NA) Kurikulum ({selectedLegerSemester}):</div>
              <div style={{ fontSize: '13px', color: '#1e40af', marginTop: '2px' }}>
                NA = (NH + PTS + PAS) / 3 — di mana NH = Tugas Harian, PTS = Sumatif Tengah Semester, PAS = Sumatif Akhir Semester.
              </div>
            </div>
          </div>

          {/* Leger Matrix Views */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            {loadingLeger ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Menghitung matriks leger nilai kelas...</div>
            ) : !legerData || legerData.students.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tidak ada data siswa di kelas ini.</div>
            ) : legerViewMode === 'vertical' ? (
              /* VERTICAL LEGER LAYOUT PER SISWA */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {legerData.students.map((st) => (
                  <div key={st._id} style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #cbd5e1', padding: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ background: st.rank <= 3 ? '#fef3c7' : '#f1f5f9', color: st.rank <= 3 ? '#b45309' : '#475569', padding: '4px 10px', borderRadius: '8px', fontWeight: '800', fontSize: '13px' }}>
                          Rank #{st.rank}
                        </span>
                        <div>
                          <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>{st.full_name}</h4>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>NIS: {st.nis || '-'}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Rata-rata Rapor ({selectedLegerSemester}):</span>
                          <strong style={{ fontSize: '16px', color: '#0284c7' }}>{st.avgRapor}</strong>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', display: 'block' }}>Kehadiran:</span>
                          <strong style={{ fontSize: '14px', color: '#16a34a' }}>{st.attendanceRate}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Vertical Mapel Scores Table */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'left' }}>
                            <th style={{ padding: '8px 12px' }}>Mata Pelajaran</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>NH (Tugas Harian)</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>PTS</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center' }}>PAS</th>
                            <th style={{ padding: '8px 12px', textAlign: 'center', color: '#0284c7', fontWeight: '800' }}>Nilai Akhir (NA)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {legerData.subjects.map((sub) => {
                            const sg = st.subjectGrades[sub._id.toString()] || { NH: '-', PTS: '-', PAS: '-', NA: '-' };
                            return (
                              <tr key={sub._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                <td style={{ padding: '8px 12px', fontWeight: '700', color: '#1e293b' }}>{sub.name}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{sg.NH}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{sg.PTS}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', color: '#475569' }}>{sg.PAS}</td>
                                <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '800', color: sg.NA !== '-' && sg.NA < 75 ? '#dc2626' : '#0284c7' }}>
                                  {sg.NA}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* HORIZONTAL LEGER MATRIX TABLE */
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', whiteSpace: 'nowrap' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}>
                      <th style={{ padding: '12px 16px', borderRight: '1px solid #334155' }} rowSpan={2}>Rank</th>
                      <th style={{ padding: '12px 16px', borderRight: '1px solid #334155' }} rowSpan={2}>NIS</th>
                      <th style={{ padding: '12px 16px', borderRight: '1px solid #334155', textAlign: 'left' }} rowSpan={2}>Nama Siswa</th>

                      {legerData.subjects.map((sub) => (
                        <th key={sub._id} colSpan={4} style={{ padding: '10px', borderRight: '1px solid #334155', borderBottom: '1px solid #334155' }}>
                          {sub.name}
                        </th>
                      ))}

                      <th style={{ padding: '12px 16px', borderRight: '1px solid #334155' }} rowSpan={2}>Rata Rapor</th>
                      <th style={{ padding: '12px 16px' }} rowSpan={2}>Presensi (%)</th>
                    </tr>
                    <tr style={{ background: '#1e293b', color: '#94a3b8', fontSize: '11px', textAlign: 'center' }}>
                      {legerData.subjects.map((sub) => (
                        <React.Fragment key={`sub-cols-${sub._id}`}>
                          <th style={{ padding: '6px 8px', borderRight: '1px solid #334155' }}>NH</th>
                          <th style={{ padding: '6px 8px', borderRight: '1px solid #334155' }}>PTS</th>
                          <th style={{ padding: '6px 8px', borderRight: '1px solid #334155' }}>PAS</th>
                          <th style={{ padding: '6px 8px', borderRight: '1px solid #475569', color: '#38bdf8', fontWeight: '700' }}>NA</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {legerData.students.map((st) => (
                      <tr key={st._id} style={{ borderBottom: '1px solid #f1f5f9', textAlign: 'center' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '800', color: st.rank <= 3 ? '#d97706' : '#64748b' }}>
                          #{st.rank}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b' }}>{st.nis}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#0f172a' }}>{st.full_name}</td>

                        {legerData.subjects.map((sub) => {
                          const sg = st.subjectGrades[sub._id.toString()] || { NH: '-', PTS: '-', PAS: '-', NA: '-' };
                          return (
                            <React.Fragment key={`cell-${st._id}-${sub._id}`}>
                              <td style={{ padding: '10px 8px', color: '#475569' }}>{sg.NH}</td>
                              <td style={{ padding: '10px 8px', color: '#475569' }}>{sg.PTS}</td>
                              <td style={{ padding: '10px 8px', color: '#475569' }}>{sg.PAS}</td>
                              <td style={{ padding: '10px 8px', fontWeight: '800', color: sg.NA < 75 ? '#dc2626' : '#0284c7', background: '#f8fafc' }}>
                                {sg.NA}
                              </td>
                            </React.Fragment>
                          );
                        })}

                        <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a', fontSize: '15px', background: '#f1f5f9' }}>
                          {st.avgRapor}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: '700', color: '#16a34a' }}>
                          {st.attendanceRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONITORING SISWA & PREDIKSI RISIKO BELAJAR (ADMIN ONLY)            */}
      {/* ========================================================================= */}
      {!isGuru && activeTab === 'students' && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Siswa</span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 0 0', fontWeight: '800', color: '#0f172a' }}>{studentStats.total_students || 0}</h2>
            </div>
            <div style={{ background: '#fff1f2', padding: '20px', borderRadius: '16px', border: '1px solid #fecdd3' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#e11d48', textTransform: 'uppercase' }}>High Risk</span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 0 0', fontWeight: '800', color: '#be123c' }}>{studentStats.high_risk_count || 0}</h2>
            </div>
            <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '16px', border: '1px solid #fef3c7' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Medium Risk</span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 0 0', fontWeight: '800', color: '#b45309' }}>{studentStats.medium_risk_count || 0}</h2>
            </div>
            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Low Risk</span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 0 0', fontWeight: '800', color: '#15803d' }}>{studentStats.low_risk_count || 0}</h2>
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
            <div style={{ flex: '1 1 250px', display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <span className="material-symbols-outlined" style={{ color: '#94a3b8', marginRight: '8px' }}>search</span>
              <input
                type="text"
                placeholder="Cari nama, NIS, atau email siswa..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
              />
            </div>

            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', outline: 'none' }}
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', outline: 'none' }}
            >
              <option value="">Semua Status Risiko</option>
              <option value="high">High Risk (Tinggi)</option>
              <option value="medium">Medium Risk (Sedang)</option>
              <option value="low">Low Risk (Rendah / Baik)</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {loadingStudents ? (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Memuat data siswa...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', fontWeight: '700' }}>
                    <th style={{ padding: '16px 20px' }}>Siswa & NIS</th>
                    <th style={{ padding: '16px 20px' }}>Kelas</th>
                    <th style={{ padding: '16px 20px' }}>Nilai Rerata</th>
                    <th style={{ padding: '16px 20px' }}>Kehadiran</th>
                    <th style={{ padding: '16px 20px' }}>Risiko (RF EWS)</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{st.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>NIS: {st.nis}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '600' }}>{st.class_name}</td>
                      <td style={{ padding: '16px 20px', fontWeight: '700' }}>{st.avgScore} / 100</td>
                      <td style={{ padding: '16px 20px' }}>{st.attendanceRate}%</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', background: st.risk === 'high' ? '#fee2e2' : st.risk === 'medium' ? '#fef3c7' : '#dcfce7', color: st.risk === 'high' ? '#991b1b' : st.risk === 'medium' ? '#92400e' : '#166534' }}>
                          {st.risk.toUpperCase()} ({st.confidence}%)
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button onClick={() => handleOpenStudentDetail(st._id)} style={{ padding: '6px 12px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
                          Detail Rapor & Analisis
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PEMETAAN GURU & BEBAN MENGAJAR (ADMIN ONLY)                        */}
      {/* ========================================================================= */}
      {!isGuru && activeTab === 'teachers' && (
        <div>
          {/* Header Summary & Filter Bar */}
          <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#2563eb' }}>badge</span>
                  Pemetaan Guru & Beban Mengajar Real-Time
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Monitoring aktivitas pemuatan materi, pembuatan tugas, dan penilain siswa per guru.</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '10px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', width: '280px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#94a3b8', marginRight: '8px', fontSize: '20px' }}>search</span>
                  <input
                    type="text"
                    placeholder="Cari nama guru, NIP, atau kode..."
                    value={teacherSearch}
                    onChange={(e) => setTeacherSearch(e.target.value)}
                    style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '14px', fontFamily: 'inherit' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Cards Grid */}
          {loadingTeachers ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>Memuat data pemetaan guru...</div>
          ) : teachers.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#94a3b8' }}>person_off</span>
              <p style={{ marginTop: '8px', color: '#64748b', fontWeight: '600' }}>Tidak ada data guru ditemukan.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
              {teachers.map((t) => {
                const initials = t.full_name
                  ? t.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
                  : 'GR';

                const totalMat = t.total_materials !== undefined ? t.total_materials : (t.stats?.total_materials || 0);
                const totalTug = t.total_assignments !== undefined ? t.total_assignments : (t.stats?.total_assignments || 0);
                const totalNilai = t.graded_submissions !== undefined ? t.graded_submissions : (t.stats?.graded_submissions || 0);
                const totalSiswa = t.total_students_taught || 0;

                return (
                  <div
                    key={t._id}
                    style={{
                      background: '#fff',
                      borderRadius: '20px',
                      border: '1px solid #e2e8f0',
                      padding: '24px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.04)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justify: 'space-between'
                    }}
                  >
                    <div>
                      {/* Top Header Avatar & Status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div
                            style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '14px',
                              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '900',
                              fontSize: '18px',
                              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a', lineHeight: '1.3' }}>
                              {t.full_name}
                            </h3>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                              NIP: {t.nip || '-'} <span style={{ color: '#cbd5e1' }}>•</span> Kode: <span style={{ fontWeight: '700', color: '#2563eb' }}>{t.teacher_code || '-'}</span>
                            </div>
                          </div>
                        </div>

                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: totalSiswa > 0 ? '#eff6ff' : '#f1f5f9',
                            color: totalSiswa > 0 ? '#2563eb' : '#64748b',
                            fontSize: '12px',
                            fontWeight: '800',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>group</span>
                          {totalSiswa} Siswa
                        </span>
                      </div>

                      {/* Subject & Classes Mapping Section */}
                      <div style={{ background: '#f8fafc', borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid #f1f5f9' }}>
                        {/* Subjects Pills */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Mata Pelajaran Diampu
                          </div>
                          {t.assigned_subjects && t.assigned_subjects.length > 0 && t.assigned_subjects[0] !== '-' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {t.assigned_subjects.map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    background: '#e0f2fe',
                                    color: '#0369a1',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                  }}
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada mapel di-assign</span>
                          )}
                        </div>

                        {/* Classes Pills */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Kelas Diampu ({t.assigned_classes ? t.assigned_classes.length : 0})
                          </div>
                          {t.assigned_classes && t.assigned_classes.length > 0 && t.assigned_classes[0] !== '-' ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '70px', overflowY: 'auto' }}>
                              {t.assigned_classes.map((cls, cIdx) => (
                                <span
                                  key={cIdx}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    background: '#fff',
                                    color: '#334155',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    border: '1px solid #cbd5e1'
                                  }}
                                >
                                  {cls}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>Belum ada kelas di-assign</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 3 Metrics Stats Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div style={{ background: '#eff6ff', borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: '1px solid #dbeafe' }}>
                        <div style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: '800', textTransform: 'uppercase' }}>MATERI</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#1e40af', marginTop: '2px' }}>{totalMat}</div>
                      </div>

                      <div style={{ background: '#faf5ff', borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: '1px solid #f3e8ff' }}>
                        <div style={{ fontSize: '11px', color: '#7e22ce', fontWeight: '800', textTransform: 'uppercase' }}>TUGAS</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#6b21a8', marginTop: '2px' }}>{totalTug}</div>
                      </div>

                      <div style={{ background: '#ecfdf5', borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: '1px solid #d1fae5' }}>
                        <div style={{ fontSize: '11px', color: '#047857', fontWeight: '800', textTransform: 'uppercase' }}>TER-NILAI</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: '#065f46', marginTop: '2px' }}>{totalNilai}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AKTIVITAS GURU (ADMIN ONLY)                                        */}
      {/* ========================================================================= */}
      {!isGuru && activeTab === 'activities' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Log Aktivitas Mengajar Real-Time</h3>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '6px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', width: '250px' }}>
              <span className="material-symbols-outlined" style={{ color: '#94a3b8', marginRight: '6px', fontSize: '18px' }}>search</span>
              <input
                type="text"
                placeholder="Filter nama guru..."
                value={activityTeacherSearch}
                onChange={(e) => setActivityTeacherSearch(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '13px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.map((act) => (
              <div key={act._id} style={{ paddingBottom: '12px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#0f172a' }}>{act.user_name}</strong>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(act.created_at).toLocaleString('id-ID')}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#334155' }}>{act.action} - {act.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL RAPOR SISWA & ANALISIS PROSES BELAJAR (EWS)                */}
      {/* ========================================================================= */}
      {selectedStudentDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                  Transkrip Rapor & Analisis Siswa
                </h3>
                <div style={{ fontSize: '14px', color: '#475569', marginTop: '4px' }}>
                  <strong>{selectedStudentDetail.student.full_name}</strong> (NIS: {selectedStudentDetail.student.nis}) — Kelas: <strong>{selectedStudentDetail.student.class_name}</strong>
                </div>
              </div>
              <button onClick={() => setSelectedStudentDetail(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            {/* Summary Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>RATA-RATA NILAI</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#2563eb', marginTop: '4px' }}>
                  {selectedStudentDetail.progress?.summary?.avg_score || 0} / 100
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>KEHADIRAN</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#16a34a', marginTop: '4px' }}>
                  {selectedStudentDetail.progress?.summary?.attendance_rate || 0}%
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>PENGERJAAN TUGAS</span>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                  {selectedStudentDetail.progress?.summary?.submitted_assignments || 0} / {selectedStudentDetail.progress?.summary?.total_assignments || 0}
                </div>
              </div>
            </div>

            {/* ML EWS Recommendation Box */}
            {selectedStudentDetail.progress?.summary?.risk_assessment && (
              <div style={{ background: selectedStudentDetail.progress.summary.risk_assessment.risk === 'high' ? '#fef2f2' : selectedStudentDetail.progress.summary.risk_assessment.risk === 'medium' ? '#fffbeb' : '#f0fdf4', border: `1px solid ${selectedStudentDetail.progress.summary.risk_assessment.risk === 'high' ? '#fecdd3' : selectedStudentDetail.progress.summary.risk_assessment.risk === 'medium' ? '#fef3c7' : '#bbf7d0'}`, borderRadius: '14px', padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="material-symbols-outlined" style={{ color: selectedStudentDetail.progress.summary.risk_assessment.risk === 'high' ? '#dc2626' : selectedStudentDetail.progress.summary.risk_assessment.risk === 'medium' ? '#d97706' : '#16a34a' }}>
                    psychology
                  </span>
                  <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                    Status Risiko Akademis (AI EWS): {selectedStudentDetail.progress.summary.risk_assessment.risk.toUpperCase()} ({selectedStudentDetail.progress.summary.risk_assessment.confidence}%)
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
                  {selectedStudentDetail.progress.summary.risk_assessment.recommendation}
                </p>
              </div>
            )}

            {/* Subject Breakdown Table */}
            <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
              Rincian Nilai & Kehadiran Per Mata Pelajaran
            </h4>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', fontWeight: '700' }}>
                    <th style={{ padding: '12px 16px' }}>Mata Pelajaran</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Nilai Rerata</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tugas Terkumpul</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Sesi Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedStudentDetail.progress?.subject_breakdown || []).map((sub, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#0f172a' }}>{sub.subject_name}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '800', color: sub.avg_score < 75 ? '#dc2626' : '#0284c7' }}>
                        {sub.avg_score}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>
                        {sub.submission_count} Tugas
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#475569' }}>
                        {sub.attendance_count} Hadir
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Parent Info */}
            {selectedStudentDetail.student.parent && (
              <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>DATA ORANG TUA / WALI:</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                  {selectedStudentDetail.student.parent.full_name} | HP: {selectedStudentDetail.student.parent.phone || '-'} | Email: {selectedStudentDetail.student.parent.email || '-'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoring;
