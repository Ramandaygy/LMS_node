import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-students.css';

const GuruWaliKelas = () => {
  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWaliKelasData();
  }, []);

  const fetchWaliKelasData = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/guru/walikelas/overview');
      setOverviewData(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Gagal memuat data Wali Kelas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-students-page">
        <div className="loading">Memuat Dashboard Wali Kelas...</div>
      </div>
    );
  }

  if (!overviewData?.is_walikelas) {
    return (
      <div className="admin-students-page" style={{ padding: '32px' }}>
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          maxWidth: '600px',
          margin: '40px auto'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: '#eff6ff',
            color: '#0284c7',
            borderRadius: '50%',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>supervisor_account</span>
          </div>
          <h2 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '12px', fontWeight: 700 }}>
            Menu Khusus Wali Kelas
          </h2>
          <p style={{ color: '#64748b', fontSize: '15px', lineHeight: 1.6, marginBottom: '24px' }}>
            Saat ini Anda terdaftar sebagai <strong>Guru Mata Pelajaran</strong>. Menu ini khusus diaktifkan apabila Administrator menugaskan Anda sebagai <strong>Wali Kelas</strong> pada salah satu kelas aktif.
          </p>
          <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', fontSize: '13px', color: '#475569', border: '1px dashed #cbd5e1' }}>
            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '6px', fontSize: '18px', color: '#0284c7' }}>info</span>
            Hubungi Administrator Sistem jika terdapat perubahan penugasan Wali Kelas Anda.
          </div>
        </div>
      </div>
    );
  }

  const { class_info, stats, students_progress } = overviewData;

  const filteredStudents = (students_progress || []).filter(s =>
    s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis?.includes(searchTerm)
  );

  return (
    <div className="admin-students-page">
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '30px 36px',
        color: '#ffffff',
        marginBottom: '28px',
        boxShadow: '0 12px 30px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="material-symbols-outlined" style={{ color: '#38bdf8', fontSize: '32px' }}>shield_person</span>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Dashboard Wali Kelas: <span style={{ color: '#38bdf8' }}>{class_info.name}</span>
            </h1>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>
            Rekapitulasi perkembangan akademik, kehadiran, dan pemantauan tingkat risiko siswa binaan kelas Anda.
          </p>
        </div>

      {errorMsg && (
        <div style={{ padding: '12px 18px', background: '#ffe4e6', color: '#e11d48', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', fontWeight: 600 }}>
          {errorMsg}
        </div>
      )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            padding: '10px 18px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: '#cbd5e1', textTransform: 'uppercase', fontWeight: 600 }}>Tingkat Kelas</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8' }}>Kelas {class_info.grade_level}</div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '28px'
      }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Total Siswa Binaan</span>
            <div style={{ width: '40px', height: '40px', background: '#eff6ff', color: '#0284c7', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">groups</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{stats.total_students} <span style={{ fontSize: '14px', color: '#94a3b8', fontWeight: 500 }}>Siswa</span></div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Rata-Rata Kehadiran</span>
            <div style={{ width: '40px', height: '40px', background: '#ecfdf5', color: '#10b981', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">calendar_month</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{stats.avg_attendance}%</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Rata-Rata Nilai</span>
            <div style={{ width: '40px', height: '40px', background: '#f5f3ff', color: '#8b5cf6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">analytics</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a' }}>{stats.avg_grade}</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '22px 24px', border: '1px solid #fecdd3', boxShadow: '0 4px 15px rgba(225, 29, 72, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#e11d48', fontWeight: 600 }}>Siswa Perlu Perhatian</span>
            <div style={{ width: '40px', height: '40px', background: '#ffe4e6', color: '#e11d48', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#e11d48' }}>{stats.high_risk} <span style={{ fontSize: '14px', color: '#f43f5e', fontWeight: 500 }}>Siswa Risiko Tinggi</span></div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="admin-students-card">
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Daftar Siswa Binaan {class_info.name}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Status risiko belajar dihitung secara real-time berdasarkan presensi dan nilai tugas.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              placeholder="Cari siswa / NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                width: '220px'
              }}
            />
          </div>
        </div>

        <div className="admin-students-table-container">
          <table className="admin-students-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                <th>Nama Siswa</th>
                <th>NIS</th>
                <th style={{ textAlign: 'center' }}>Kehadiran</th>
                <th style={{ textAlign: 'center' }}>Rata-Rata Nilai</th>
                <th style={{ textAlign: 'center' }}>Status Risiko Belajar</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Tidak ada siswa binaan yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((siswa, idx) => (
                  <tr key={siswa.studentId || idx}>
                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{siswa.studentName}</div>
                    </td>
                    <td style={{ color: '#475569', fontSize: '13px' }}>{siswa.nis || '-'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: siswa.attendanceRate >= 80 ? '#e8f5e9' : '#fdecea',
                        color: siswa.attendanceRate >= 80 ? '#27ae60' : '#e74c3c'
                      }}>
                        {siswa.attendanceRate}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: '#1e293b' }}>
                      {siswa.avgScore || 0}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {siswa.risk === 'high' && (
                        <span style={{ background: '#ffe4e6', color: '#e11d48', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>error</span> Risiko Tinggi
                        </span>
                      )}
                      {siswa.risk === 'medium' && (
                        <span style={{ background: '#fef3c7', color: '#d97706', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>warning</span> Risiko Sedang
                        </span>
                      )}
                      {siswa.risk === 'low' && (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span> Aman / Rendah
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GuruWaliKelas;
