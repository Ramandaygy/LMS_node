import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css';
import '../../../styles/dashboard/admin/admin-reports.css';

const AdminMonitoring = () => {
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'teachers' | 'activities'

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
  const [classes, setClasses] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  // Selected Student Detail Modal
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Teacher State
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [selectedTeacherSample, setSelectedTeacherSample] = useState(null);

  // Activity State
  const [activities, setActivities] = useState([]);
  const [activitySummary, setActivitySummary] = useState([]);
  const [activityTeacherSearch, setActivityTeacherSearch] = useState('');
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudentsMonitoring();
    } else if (activeTab === 'teachers') {
      fetchTeachersMonitoring();
    } else if (activeTab === 'activities') {
      fetchTeacherActivities();
    }
  }, [activeTab, studentSearch, selectedClassFilter, selectedRiskFilter, teacherSearch, activityTeacherSearch]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data || []);
    } catch (e) {
      console.error('Error fetching classes:', e);
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
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/monitoring/students/${studentId}`);
      setSelectedStudentDetail(res.data);
      setLoadingDetail(false);
    } catch (e) {
      console.error('Error fetching student detail:', e);
      setLoadingDetail(false);
    }
  };

  const fetchTeachersMonitoring = async () => {
    setLoadingTeachers(true);
    try {
      const params = {};
      if (teacherSearch) params.search = teacherSearch;
      const res = await api.get('/admin/monitoring/teachers', { params });
      setTeachers(res.data.data || []);
      setLoadingTeachers(false);
    } catch (e) {
      console.error('Error fetching teacher monitoring:', e);
      setLoadingTeachers(false);
    }
  };

  const fetchTeacherActivities = async () => {
    setLoadingActivities(true);
    try {
      const params = {};
      if (activityTeacherSearch) params.teacher_name = activityTeacherSearch;
      const res = await api.get('/admin/monitoring/teacher-activities', { params });
      setActivities(res.data.logs || []);
      setActivitySummary(res.data.summary || []);
      setLoadingActivities(false);
    } catch (e) {
      console.error('Error fetching teacher activities:', e);
      setLoadingActivities(false);
    }
  };

  return (
    <div className="admin-monitoring-page" style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#3b82f6' }}>monitoring</span>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800', color: '#0f172a', fontFamily: 'Outfit, sans-serif' }}>
            Pusat Monitoring Admin
          </h1>
        </div>
        <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
          Pantau performa belajar siswa, pemetaan pengampuan guru, dan rekap aktivitas mengajar secara real-time.
        </p>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '28px' }}>
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
          Monitoring Siswa & Risiko Belajar (EWS)
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
          Aktivitas Mengajar Guru
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MONITORING SISWA & PREDIKSI RISIKO BELAJAR                         */}
      {/* ========================================================================= */}
      {activeTab === 'students' && (
        <div>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Total Siswa Dipantau</span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 0 0', fontWeight: '800', color: '#0f172a' }}>{studentStats.total_students || 0}</h2>
            </div>

            <div style={{ background: '#fff1f2', padding: '20px', borderRadius: '16px', border: '1px solid #fecdd3', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#e11d48', textTransform: 'uppercase' }}>High Risk (Peringatan Dini)</span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 0 0', fontWeight: '800', color: '#be123c' }}>{studentStats.high_risk_count || 0}</h2>
            </div>

            <div style={{ background: '#fffbeb', padding: '20px', borderRadius: '16px', border: '1px solid #fef3c7', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Medium Risk (Perlu Perhatian)</span>
              <h2 style={{ fontSize: '32px', margin: '8px 0 0 0', fontWeight: '800', color: '#b45309' }}>{studentStats.medium_risk_count || 0}</h2>
            </div>

            <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '16px', border: '1px solid #bbf7d0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase' }}>Low Risk (Aman / Baik)</span>
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
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            {loadingStudents ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat data siswa...</div>
            ) : students.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tidak ada data siswa ditemukan.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '12px', fontWeight: '700' }}>
                    <th style={{ padding: '16px 20px' }}>Siswa & NIS</th>
                    <th style={{ padding: '16px 20px' }}>Kelas</th>
                    <th style={{ padding: '16px 20px' }}>Nilai Rerata</th>
                    <th style={{ padding: '16px 20px' }}>Kehadiran</th>
                    <th style={{ padding: '16px 20px' }}>Materi Selesai</th>
                    <th style={{ padding: '16px 20px' }}>Status Risiko (RF)</th>
                    <th style={{ padding: '16px 20px', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={st._id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{st.full_name}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>NIS: {st.nis}</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: '#334155' }}>{st.class_name}</td>
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: st.avgScore < 60 ? '#e11d48' : '#0f172a' }}>{st.avgScore} / 100</td>
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: '#334155' }}>{st.attendanceRate}%</td>
                      <td style={{ padding: '16px 20px', fontWeight: '600', color: '#334155' }}>{st.materialCompletionRate}%</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background:
                              st.risk === 'high' ? '#fee2e2' : st.risk === 'medium' ? '#fef3c7' : '#dcfce7',
                            color:
                              st.risk === 'high' ? '#991b1b' : st.risk === 'medium' ? '#92400e' : '#166534',
                          }}
                        >
                          {st.risk.toUpperCase()} RISK ({st.confidence}%)
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleOpenStudentDetail(st._id)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: '#eff6ff',
                            color: '#2563eb',
                            border: 'none',
                            fontWeight: '700',
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
                          Detail
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
      {/* TAB 2: PEMETAAN GURU & SISWA BINAAN                                      */}
      {/* ========================================================================= */}
      {activeTab === 'teachers' && (
        <div>
          {/* Filter Bar */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
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

          {/* Teachers List */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
            {loadingTeachers ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat data pemetaan guru...</div>
            ) : teachers.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: '#64748b' }}>Tidak ada data guru ditemukan.</div>
            ) : (
              teachers.map((t) => (
                <div key={t._id} style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', justifyBetween: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{t.full_name}</h3>
                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '600' }}>NIP: {t.nip} | Kode: {t.teacher_code}</p>
                      </div>
                      <span style={{ background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                        {t.total_students_taught} Siswa
                      </span>
                    </div>

                    <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                      <div>
                        <strong style={{ color: '#475569' }}>Mata Pelajaran: </strong>
                        <span style={{ color: '#0f172a' }}>{t.assigned_subjects.join(', ') || 'Belum Diatur'}</span>
                      </div>
                      <div>
                        <strong style={{ color: '#475569' }}>Kelas Diampu: </strong>
                        <span style={{ color: '#0f172a' }}>{t.assigned_classes.join(', ') || 'Belum Diatur'}</span>
                      </div>
                    </div>

                    {/* Stats Metrics */}
                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Materi Unggahan</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{t.stats.total_materials}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Tugas Dibuat</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{t.stats.total_assignments}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Submisi Dinilai</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{t.stats.grading_percentage}%</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Sesi Presensi</span>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>{t.stats.attendance_sessions}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTeacherSample(t)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '10px',
                      background: '#f1f5f9',
                      color: '#334155',
                      border: 'none',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>groups</span>
                    Lihat Daftar Siswa Diajar ({t.total_students_taught})
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MONITORING AKTIVITAS GURU                                         */}
      {/* ========================================================================= */}
      {activeTab === 'activities' && (
        <div>
          {/* Summary Box */}
          <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Rekap Keaktifan Guru</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
              {activitySummary.map((sum, idx) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '50%', display: 'flex' }}>
                    <span className="material-symbols-outlined" style={{ color: '#4f46e5' }}>person</span>
                  </div>
                  <div>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '14px' }}>{sum._id || 'Guru'}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{sum.total_actions} aktivitas dicatat</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filter Bar */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <span className="material-symbols-outlined" style={{ color: '#94a3b8', marginRight: '8px' }}>search</span>
              <input
                type="text"
                placeholder="Filter berdasarkan nama guru..."
                value={activityTeacherSearch}
                onChange={(e) => setActivityTeacherSearch(e.target.value)}
                style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
              />
            </div>
          </div>

          {/* Timeline Feed */}
          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>Log Aktivitas Real-Time Guru</h3>
            {loadingActivities ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Memuat log aktivitas...</div>
            ) : activities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Belum ada catatan aktivitas guru.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activities.map((act) => (
                  <div key={act._id} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', paddingBottom: '16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ background: '#eff6ff', color: '#2563eb', padding: '10px', borderRadius: '12px', display: 'flex' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_note</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <strong style={{ color: '#0f172a', fontSize: '15px' }}>{act.user_name}</strong>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(act.created_at).toLocaleString('id-ID')}</span>
                      </div>
                      <div style={{ fontSize: '14px', color: '#334155', fontWeight: '600' }}>{act.action}</div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>{act.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETAIL MONITORING SISWA & ORTU                                     */}
      {/* ========================================================================= */}
      {selectedStudentDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>Detail Profil & Performa Siswa</h2>
              <button onClick={() => setSelectedStudentDetail(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span>
              </button>
            </div>

            {/* Profile Info */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Nama Lengkap</span>
                <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>{selectedStudentDetail.student.full_name}</div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>NIS: {selectedStudentDetail.student.nis}</div>
                <div style={{ fontSize: '13px', color: '#475569' }}>Kelas: {selectedStudentDetail.student.class_name}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Orang Tua / Wali</span>
                {selectedStudentDetail.student.parent ? (
                  <>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{selectedStudentDetail.student.parent.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#475569' }}>HP: {selectedStudentDetail.student.parent.phone}</div>
                    <div style={{ fontSize: '13px', color: '#475569' }}>Email: {selectedStudentDetail.student.parent.email}</div>
                  </>
                ) : (
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>Belum terhubung ke Wali</div>
                )}
              </div>
            </div>

            {/* Risk EWS Status */}
            <div style={{ background: selectedStudentDetail.progress.color === 'red' ? '#fee2e2' : selectedStudentDetail.progress.color === 'yellow' ? '#fef3c7' : '#dcfce7', padding: '16px', borderRadius: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: selectedStudentDetail.progress.color === 'red' ? '#dc2626' : selectedStudentDetail.progress.color === 'yellow' ? '#d97706' : '#16a34a' }}>
                {selectedStudentDetail.progress.color === 'red' ? 'warning' : selectedStudentDetail.progress.color === 'yellow' ? 'info' : 'check_circle'}
              </span>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: '#0f172a' }}>
                  Status Risiko: {selectedStudentDetail.progress.risk?.toUpperCase()} ({selectedStudentDetail.progress.confidence}% Keyakinan RF)
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                  {selectedStudentDetail.progress.message}
                </div>
              </div>
            </div>

            {/* Scores Table */}
            <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Riwayat Nilai Tugas & Ujian</h4>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textTransform: 'uppercase', color: '#64748b', fontSize: '11px' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Tugas / Ujian</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Nilai</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedStudentDetail.progress.detailedAssignments || []).map((asg, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '600' }}>{asg.title}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700' }}>{asg.score} / {asg.max_score}</td>
                    </tr>
                  ))}
                  {(selectedStudentDetail.progress.detailedGrades || []).map((grd, idx) => (
                    <tr key={`grd-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '600' }}>{grd.subject_name} ({grd.type?.toUpperCase()})</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: '700' }}>{grd.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DAFTAR SISWA YANG DIAJAR GURU                                      */}
      {/* ========================================================================= */}
      {selectedTeacherSample && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Siswa Diajar: {selectedTeacherSample.full_name}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Kelas: {selectedTeacherSample.assigned_classes.join(', ')}</p>
              </div>
              <button onClick={() => setSelectedTeacherSample(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>close</span>
              </button>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textTransform: 'uppercase', color: '#64748b', fontSize: '11px' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Nama Siswa</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>NIS</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left' }}>Kelas</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedTeacherSample.students_taught_sample || []).map((st) => (
                    <tr key={st._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>{st.full_name}</td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{st.nis}</td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>{st.class_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMonitoring;
