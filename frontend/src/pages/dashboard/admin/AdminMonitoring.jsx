import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css';
import '../../../styles/dashboard/admin/admin-reports.css';

const AdminMonitoring = () => {
  const [activeTab, setActiveTab] = useState('leger'); // 'leger' | 'students' | 'teachers' | 'activities'

  // Classes list
  const [classes, setClasses] = useState([]);

  // Leger State
  const [selectedLegerClass, setSelectedLegerClass] = useState('');
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

  // Teacher State
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');

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
    } else if (activeTab === 'students') {
      fetchStudentsMonitoring();
    } else if (activeTab === 'teachers') {
      fetchTeachersMonitoring();
    } else if (activeTab === 'activities') {
      fetchTeacherActivities();
    }
  }, [activeTab, selectedLegerClass, studentSearch, selectedClassFilter, selectedRiskFilter, teacherSearch, activityTeacherSearch]);

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
        params: { class_id: selectedLegerClass },
        responseType: 'blob',
      });

      const className = legerData?.class_info?.name || 'Kelas';
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Leger_Nilai_${className.replace(/\s+/g, '_')}.xlsx`);
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
    try {
      const res = await api.get(`/admin/monitoring/students/${studentId}`);
      setSelectedStudentDetail(res.data);
    } catch (e) {
      console.error('Error fetching student detail:', e);
    }
  };

  const fetchTeachersMonitoring = async () => {
    try {
      const params = {};
      if (teacherSearch) params.search = teacherSearch;
      const res = await api.get('/admin/monitoring/teachers', { params });
      setTeachers(res.data.data || []);
    } catch (e) {
      console.error('Error fetching teacher monitoring:', e);
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
            Pusat Monitoring & Leger Nilai Sekolah
          </h1>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
          Rekapitulasi Leger Nilai Akademik (Formula 2:1:1), Rapor Siswa, Pemetaan Guru, dan Audit Log Aktivitas.
        </p>
      </div>

      {/* Main Tabs Navigation */}
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
            gap: '8px'
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
            gap: '8px'
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
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>supervisor_account</span>
          Pemetaan Guru & Siswa
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
            gap: '8px'
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>history</span>
          Log Aktivitas Mengajar
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MATRIKS LEGER NILAI KELAS (RUMUS 2 : 1 : 1)                        */}
      {/* ========================================================================= */}
      {activeTab === 'leger' && (
        <div>
          {/* Controls & Class Selector */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>Pilih Kelas:</label>
              <select
                value={selectedLegerClass}
                onChange={(e) => setSelectedLegerClass(e.target.value)}
                style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontWeight: '700', fontSize: '14px', outline: 'none' }}
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
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
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>file_download</span>
                  {exportingExcel ? 'Mengunduh...' : 'Cetak / Unduh Excel Leger (.xlsx)'}
                </button>
              </div>
            )}
          </div>

          {/* Formula Callout Banner */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: '28px' }}>calculate</span>
            <div>
              <div style={{ fontWeight: '800', color: '#1e3a8a', fontSize: '14px' }}>Formula Nilai Akhir Mapel (NA) Standar SMP (2 : 1 : 1):</div>
              <div style={{ fontSize: '13px', color: '#1e40af', marginTop: '2px' }}>
                NA = (2 × NH + PTS + PAS) / 4 — di mana NH = Rata-Rata Tugas & Kuis Harian, PTS = Nilai UTS, PAS = Nilai UAS. Rata-Rata Rapor = Rata-rata dari seluruh NA Mata Pelajaran.
              </div>
            </div>
          </div>

          {/* Leger Matrix Table */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            {loadingLeger ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Menghitung matriks leger nilai kelas...</div>
            ) : !legerData || legerData.students.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tidak ada data siswa di kelas ini.</div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONITORING SISWA & PREDIKSI RISIKO BELAJAR (EWS)                  */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
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
                          Detail Rapor
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
      {/* TAB 3: PEMETAAN GURU                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'teachers' && (
        <div>
          <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <span className="material-symbols-outlined" style={{ color: '#94a3b8', marginRight: '8px' }}>search</span>
              <input
                type="text"
                placeholder="Cari nama guru, NIP, atau kode guru..."
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {teachers.map((t) => (
              <div key={t._id} style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '20px' }}>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{t.full_name}</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>NIP: {t.nip} | Kode: {t.teacher_code}</p>
                <div style={{ margin: '12px 0', fontSize: '13px' }}>
                  <div><strong style={{ color: '#475569' }}>Mapel: </strong>{t.assigned_subjects.join(', ') || '-'}</div>
                  <div><strong style={{ color: '#475569' }}>Kelas: </strong>{t.assigned_classes.join(', ') || '-'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AKTIVITAS GURU                                                     */}
      {/* ========================================================================= */}
      {activeTab === 'activities' && (
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
      {/* MODAL: DETAIL SISWA                                                       */}
      {/* ========================================================================= */}
      {selectedStudentDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Transkrip Rapor Siswa: {selectedStudentDetail.student.full_name}</h3>
              <button onClick={() => setSelectedStudentDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
              </button>
            </div>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>Kelas: {selectedStudentDetail.student.class_name} | NIS: {selectedStudentDetail.student.nis}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoring;
