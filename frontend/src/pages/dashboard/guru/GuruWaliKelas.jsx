import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
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

  const { pieData, barData } = useMemo(() => {
    if (!overviewData?.students_progress) return { pieData: [], barData: [] };
    
    // Calculate Pie Data (Risk Status)
    const riskCounts = { high: 0, medium: 0, low: 0 };
    overviewData.students_progress.forEach(s => {
      if (s.risk) riskCounts[s.risk]++;
      else riskCounts.low++;
    });
    
    const pie = [
      { name: 'Aman / Rendah', value: riskCounts.low, color: '#10b981' },
      { name: 'Risiko Sedang', value: riskCounts.medium, color: '#f59e0b' },
      { name: 'Risiko Tinggi', value: riskCounts.high, color: '#ef4444' },
    ].filter(d => d.value > 0);

    // Calculate Bar Data (Score Distribution)
    const scoreRanges = { '0-50': 0, '51-75': 0, '76-90': 0, '91-100': 0 };
    overviewData.students_progress.forEach(s => {
      const score = s.avgScore || 0;
      if (score <= 50) scoreRanges['0-50']++;
      else if (score <= 75) scoreRanges['51-75']++;
      else if (score <= 90) scoreRanges['76-90']++;
      else scoreRanges['91-100']++;
    });

    const bar = [
      { name: '0-50 (Kurang)', total: scoreRanges['0-50'] },
      { name: '51-75 (Cukup)', total: scoreRanges['51-75'] },
      { name: '76-90 (Baik)', total: scoreRanges['76-90'] },
      { name: '91-100 (Sangat Baik)', total: scoreRanges['91-100'] },
    ];

    return { pieData: pie, barData: bar };
  }, [overviewData]);


  if (loading) {
    return (
      <div className="admin-students-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', animation: 'spin 1.5s linear infinite' }}>autorenew</span>
          <div style={{ marginTop: '12px', fontWeight: 600 }}>Memuat Dashboard Wali Kelas...</div>
        </div>
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
    <div className="admin-students-page" style={{ paddingBottom: '40px' }}>
      {/* Premium Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        borderRadius: '20px',
        padding: '36px 40px',
        color: '#ffffff',
        marginBottom: '32px',
        boxShadow: '0 15px 35px rgba(59, 130, 246, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Dekorasi Background */}
        <div style={{ position: 'absolute', right: '-10%', top: '-50%', width: '300px', height: '300px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', filter: 'blur(30px)' }}></div>
        <div style={{ position: 'absolute', left: '-5%', bottom: '-50%', width: '200px', height: '200px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(20px)' }}></div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>school</span>
            </div>
            <h1 style={{ margin: 0, fontSize: '30px', fontWeight: 800, letterSpacing: '-0.5px' }}>
              Dashboard Wali Kelas: <span style={{ color: '#bae6fd' }}>{class_info.name}</span>
            </h1>
          </div>
          <p style={{ margin: 0, color: '#e0f2fe', fontSize: '15px', maxWidth: '600px', lineHeight: 1.5 }}>
            Pantau performa akademik, tingkat kehadiran, dan deteksi dini status risiko belajar seluruh siswa binaan Anda.
          </p>
        </div>

        {errorMsg && (
          <div style={{ padding: '12px 18px', background: '#ffe4e6', color: '#e11d48', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', fontWeight: 600, position: 'relative', zIndex: 1 }}>
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', position: 'relative', zIndex: 1 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(12px)',
            padding: '14px 24px',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: '#e0f2fe', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '1px' }}>Tingkat Kelas</div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff' }}>Kelas {class_info.grade_level}</div>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid with Hover Effects */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Total Siswa Binaan</span>
            <div style={{ width: '48px', height: '48px', background: '#eff6ff', color: '#3b82f6', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>groups</span>
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {stats.total_students} <span style={{ fontSize: '16px', color: '#94a3b8', fontWeight: 600 }}>Siswa</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Rata-Rata Kehadiran</span>
            <div style={{ width: '48px', height: '48px', background: '#ecfdf5', color: '#10b981', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>calendar_month</span>
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>{stats.avg_attendance}%</div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Rata-Rata Nilai</span>
            <div style={{ width: '48px', height: '48px', background: '#f5f3ff', color: '#8b5cf6', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>analytics</span>
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#0f172a' }}>{stats.avg_grade}</div>
        </div>

        <div style={{ background: '#fff1f2', borderRadius: '20px', padding: '24px', border: '1px solid #fecdd3', boxShadow: '0 10px 25px rgba(225, 29, 72, 0.08)', transition: 'transform 0.3s', cursor: 'default' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', color: '#be123c', fontWeight: 800, textTransform: 'uppercase' }}>Perlu Perhatian</span>
            <div style={{ width: '48px', height: '48px', background: '#ffe4e6', color: '#e11d48', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>warning</span>
            </div>
          </div>
          <div style={{ fontSize: '36px', fontWeight: 900, color: '#be123c', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            {stats.high_risk} <span style={{ fontSize: '15px', color: '#e11d48', fontWeight: 600 }}>Siswa Risiko Tinggi</span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* Bar Chart */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Distribusi Rata-Rata Nilai Siswa</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <RechartsTooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} 
                />
                <Bar dataKey="total" name="Jumlah Siswa" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Proporsi Status Risiko Belajar</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 600 }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main Table Card - Enhanced */}
      <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', overflow: 'hidden' }}>
        <div style={{ padding: '24px 30px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0f172a' }}>Daftar Siswa Binaan {class_info.name}</h3>
            <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b' }}>Status risiko dihitung otomatis (*real-time*) berdasarkan presensi dan nilai tes.</p>
          </div>

          <div style={{ display: 'flex', gap: '12px', position: 'relative' }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '20px' }}>search</span>
            <input
              type="text"
              placeholder="Cari nama atau NIS..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '12px 16px 12px 42px',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                fontSize: '14px',
                outline: 'none',
                width: '260px',
                transition: 'border-color 0.3s, box-shadow 0.3s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#3b82f6';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto', padding: '0 10px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', width: '60px', textAlign: 'center' }}>No</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>Nama Lengkap</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase' }}>NIS</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Kehadiran</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Progress Belajar</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Rata-Rata Nilai</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center' }}>Status Risiko</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#cbd5e1', marginBottom: '16px', display: 'block' }}>person_off</span>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>Tidak ada data siswa ditemukan.</div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((siswa, idx) => (
                  <tr key={siswa.studentId || idx} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 700, color: '#94a3b8' }}>{idx + 1}</td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '15px', marginBottom: '2px' }}>{siswa.studentName}</div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#64748b', fontSize: '14px', fontWeight: 500 }}>{siswa.nis || '-'}</td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 700,
                        background: siswa.attendanceRate >= 80 ? '#ecfdf5' : '#fef2f2',
                        color: siswa.attendanceRate >= 80 ? '#10b981' : '#ef4444',
                        minWidth: '60px'
                      }}>
                        {siswa.attendanceRate}%
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <div style={{ width: '60px', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${siswa.materialCompletionRate || 0}%`, height: '100%', background: siswa.materialCompletionRate >= 75 ? '#3b82f6' : '#f59e0b', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#475569', minWidth: '35px' }}>{siswa.materialCompletionRate || 0}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center', fontWeight: 800, color: '#1e293b', fontSize: '16px' }}>
                      {siswa.avgScore || 0}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      {siswa.risk === 'high' && (
                        <span style={{ background: '#fff1f2', color: '#e11d48', padding: '6px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #ffe4e6' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>error</span> Risiko Tinggi
                        </span>
                      )}
                      {siswa.risk === 'medium' && (
                        <span style={{ background: '#fffbeb', color: '#d97706', padding: '6px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #fef3c7' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span> Risiko Sedang
                        </span>
                      )}
                      {siswa.risk === 'low' && (
                        <span style={{ background: '#f0fdf4', color: '#15803d', padding: '6px 16px', borderRadius: '30px', fontSize: '13px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #dcfce7' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Aman
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
