import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-reports.css';

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [dateRange, setDateRange] = useState('semester');
  const [recentActivities, setRecentActivities] = useState([]);
  
  // Modal Preview States
  const [previewModal, setPreviewModal] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [classRes, activityRes] = await Promise.all([
        api.get('/classes'),
        api.get('/admin/reports/audit-trail')
      ]);
      const fetchedClasses = classRes.data.data || [];
      fetchedClasses.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' }));
      setClassesList(fetchedClasses);
      
      const logs = activityRes.data.logs || [];
      setRecentActivities(logs.slice(0, 8));
      setLoading(false);
    } catch (error) {
      console.error('Error loading report dashboard:', error);
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // PREVIEW MODAL HANDLER
  // -------------------------------------------------------------
  const handleOpenPreview = async (type, title) => {
    setPreviewTitle(title);
    setPreviewType(type);
    setPreviewModal(true);
    setLoadingPreview(true);
    setPreviewData(null);

    try {
      let endpoint = '';
      if (type === 'academic-master') {
        endpoint = `/admin/reports/academic-master?class_id=${selectedClass}`;
      } else if (type === 'attendance-recap') {
        endpoint = `/admin/reports/attendance-recap?class_id=${selectedClass}`;
      } else if (type === 'user-management') {
        endpoint = `/admin/reports/user-management`;
      } else if (type === 'evaluations') {
        endpoint = `/admin/reports/evaluations`;
      } else if (type === 'audit-trail') {
        endpoint = `/admin/reports/audit-trail`;
      }

      const response = await api.get(endpoint);
      setPreviewData(response.data);
      setLoadingPreview(false);
    } catch (err) {
      console.error('Preview error:', err);
      alert('Gagal memuat pratinjau data laporan.');
      setLoadingPreview(false);
    }
  };

  // -------------------------------------------------------------
  // EXCEL EXPORT HANDLER
  // -------------------------------------------------------------
  const handleExportExcel = async (type) => {
    try {
      let endpoint = `/admin/export/${type}`;
      if (type === 'academic-master' || type === 'attendance-recap') {
        endpoint += `?class_id=${selectedClass}`;
      }
      
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rekap_${type}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Gagal mengunduh berkas Excel laporan');
    }
  };

  // -------------------------------------------------------------
  // PDF PRINT HANDLER WITH OFFICIAL KOP SURAT
  // -------------------------------------------------------------
  const handleExportPDF = async (type, titleName) => {
    try {
      let title = titleName || 'LAPORAN REKAPITULASI SEKOLAH';
      let headers = [];
      let rows = [];

      if (type === 'academic-master') {
        const res = await api.get(`/admin/reports/academic-master?class_id=${selectedClass}`);
        const data = res.data.students_leger || [];
        title = 'LAPORAN REKAPITULASI LEGER AKADEMIK (AGREGAT SEKOLAH)';
        headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Total Nilai', 'Rata-Rata', 'Status Ketuntasan'];
        rows = data.map((st, i) => [
          i + 1,
          st.nis,
          st.name,
          st.class_name,
          st.total_score,
          st.avg_score,
          st.is_tuntas ? 'TUNTAS' : 'BELUM TUNTAS'
        ]);
      } else if (type === 'attendance-recap') {
        const res = await api.get(`/admin/reports/attendance-recap?class_id=${selectedClass}`);
        const data = res.data.class_summary || [];
        // Natural sort classes for print PDF
        data.sort((a, b) => (a.class_name || '').localeCompare(b.class_name || '', undefined, { numeric: true, sensitivity: 'base' }));

        title = 'LAPORAN REKAPITULASI PRESENSI / KEHADIRAN SISWA PER KELAS';
        headers = ['No', 'Nama Kelas', 'Jumlah Siswa', 'Hadir', 'Sakit', 'Izin', 'Alpa', '% Kehadiran'];
        rows = data.map((c, i) => [
          i + 1,
          c.class_name,
          c.total_students,
          c.hadir,
          c.sakit,
          c.izin,
          c.alpa,
          `${c.pct_hadir}%`
        ]);
      } else if (type === 'user-management') {
        const res = await api.get('/admin/reports/user-management');
        const data = res.data.rombel_summary || [];
        data.sort((a, b) => (a.class_name || '').localeCompare(b.class_name || '', undefined, { numeric: true, sensitivity: 'base' }));

        title = 'LAPORAN REKAPITULASI MANAJEMEN AKUN & KELAS (ROMBEL)';
        headers = ['No', 'Nama Kelas (Rombel)', 'Jumlah Siswa Terdaftar'];
        rows = data.map((r, i) => [
          i + 1,
          r.class_name,
          `${r.student_count} Siswa`
        ]);
      } else if (type === 'evaluations') {
        const res = await api.get('/admin/reports/evaluations');
        const data = res.data.evaluations || [];
        title = 'LAPORAN REKAPITULASI EVALUASI UJIAN & TUGAS';
        headers = ['No', 'Judul Tugas / Evaluasi', 'Kelas Target', 'Total Mengumpulkan', 'Sudah Dinilai', 'Belum Dinilai'];
        rows = data.map((e, i) => [
          i + 1,
          e.title,
          e.class_name,
          e.total_submissions,
          e.total_graded,
          e.total_pending
        ]);
      } else if (type === 'audit-trail') {
        const res = await api.get('/admin/reports/audit-trail');
        const data = res.data.logs || [];
        title = 'LAPORAN AUDIT TRAIL & LOG KEAMANAN SISTEM';
        headers = ['No', 'Stempel Waktu', 'Pengguna', 'Aktivitas / Aksi', 'Detail Rincian'];
        rows = data.map((l, i) => [
          i + 1,
          l.time,
          l.user,
          l.action,
          l.detail
        ]);
      }

      const printWindow = window.open('', '_blank');
      const today = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      const htmlContent = `
        <html>
        <head>
          <title>${title}</title>
          <style>
            @media print {
              body { margin: 1cm; font-family: 'Times New Roman', Times, serif; color: #000; font-size: 11pt; }
              @page { size: A4 portrait; margin: 1cm; }
            }
            body { font-family: 'Times New Roman', Times, serif; padding: 20px; color: #000; line-height: 1.3; }
            
            /* Kop Surat Styles */
            .kop-container { display: flex; align-items: center; border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 20px; }
            .kop-logo { width: 70px; height: auto; margin-right: 15px; }
            .kop-text { text-align: center; flex-grow: 1; }
            .kop-text h4 { margin: 0; font-size: 11pt; font-weight: normal; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop-text h3 { margin: 2px 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
            .kop-text p { margin: 2px 0; font-size: 9pt; font-style: italic; color: #333; }
            
            .doc-title { text-align: center; font-size: 12pt; font-weight: bold; text-decoration: underline; margin-bottom: 16px; text-transform: uppercase; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
            th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 9.5pt; }
            .text-center { text-align: center; }
            
            .sig-container { margin-top: 40px; display: flex; justify-content: flex-end; font-size: 11pt; page-break-inside: avoid; }
            .sig-box { text-align: center; width: 230px; }
            .sig-space { height: 60px; }
            .sig-name { font-weight: bold; text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="kop-container">
            <img class="kop-logo" src="https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_Tut_Wuri_Handayani.png" alt="Logo Tut Wuri" />
            <div class="kop-text">
              <h4>Pemerintah Kabupaten Tegal</h4>
              <h4>Dinas Pendidikan dan Kebudayaan</h4>
              <h3>SMP NEGERI 1 SURADADI</h3>
              <p>Jl. Raya Purwahamba No. 76, Suradadi, Kab. Tegal 52182</p>
              <p>Email: smpn1suradadi@sch.id | Website: smpn1suradadi.sch.id</p>
            </div>
          </div>
          
          <div class="doc-title">${title}</div>
          
          <table>
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr>
                  ${row.map((cell, idx) => `
                    <td class="${idx === 0 || idx === 1 || idx === 3 || idx === 4 || idx === 5 || idx === 6 || idx === 7 ? 'text-center' : ''}">${cell}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="sig-container">
            <div class="sig-box">
              <p>Suradadi, ${today}</p>
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div class="sig-space"></div>
              <p class="sig-name">SUHARTO, S.Pd.,M.M.</p>
              <p>NIP. 19671022 199401 1 001</p>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Gagal mencetak laporan PDF');
    }
  };

  if (loading) {
    return (
      <div className="reports-loading-screen">
        <div className="spinner"></div>
        <p>Memuat Dashboard Rekapitulasi Laporan Eksekutif...</p>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Page Header */}
      <div className="reports-header">
        <div>
          <span className="reports-badge">Executive Reporting Engine</span>
          <h2 className="reports-title">Pusat Laporan & Rekapitulasi Sekolah</h2>
          <p className="reports-subtitle">Rekapitulasi teragregasi 5 pilar utama akademik, presensi, KBM, dan pengawasan sistem LMS</p>
        </div>
      </div>

      {/* Filter Bar Toolbar */}
      <div className="reports-filters-toolbar">
        <div className="filter-item">
          <label><span className="material-symbols-outlined">class</span> Filter Kelas / Rombel</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="all">Semua Kelas (Agregat Sekolah)</option>
            {classesList.map(c => (
              <option key={c._id} value={c._id}>Kelas {c.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label><span className="material-symbols-outlined">date_range</span> Periode Akademik</label>
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="semester">Semester Genap 2025/2026</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ajaran 2025/2026</option>
          </select>
        </div>
      </div>

      {/* 5 PILAR REPORT CARDS GRID */}
      <div className="reports-pillars-grid">
        
        {/* PILAR 1: AKADEMIK MASTER */}
        <div className="pillar-card academic">
          <div className="pillar-card-header">
            <div className="pillar-icon academic">
              <span className="material-symbols-outlined">military_tech</span>
            </div>
            <div className="pillar-tags">
              <span className="tag">Leger Master</span>
              <span className="tag">Ketuntasan KKM 75</span>
            </div>
          </div>
          <div className="pillar-card-body">
            <h3>🎓 1. Rekap Data Akademik Master (Agregat Sekolah)</h3>
            <p>Rekapitulasi Leger Nilai master seluruh kelas (7A-7J, 8A-8J, 9A-9I), statistik rata-rata per mata pelajaran, dan ketuntasan KKM.</p>
          </div>
          <div className="pillar-card-footer">
            <button className="btn-preview" onClick={() => handleOpenPreview('academic-master', 'Pratinjau Leger Master Akademik')}>
              <span className="material-symbols-outlined">visibility</span> Pratinjau Data
            </button>
            <div className="btn-group">
              <button className="btn-export pdf" onClick={() => handleExportPDF('academic-master', 'LAPORAN REKAPITULASI LEGER AKADEMIK SEKOLAH')}>
                <span className="material-symbols-outlined">picture_as_pdf</span> PDF
              </button>
              <button className="btn-export excel" onClick={() => handleExportExcel('academic-master')}>
                <span className="material-symbols-outlined">table_chart</span> Excel
              </button>
            </div>
          </div>
        </div>

        {/* PILAR 2: PRESENSI & RED FLAG */}
        <div className="pillar-card attendance">
          <div className="pillar-card-header">
            <div className="pillar-icon attendance">
              <span className="material-symbols-outlined">how_to_reg</span>
            </div>
            <div className="pillar-tags">
              <span className="tag warning">Red Flag BK (Alpa)</span>
              <span className="tag">% Kehadiran</span>
            </div>
          </div>
          <div className="pillar-card-body">
            <h3>📋 2. Rekap Kehadiran (Presensi) & Siswa Red Flag</h3>
            <p>Persentase presensi harian/bulanan per kelas dan deteksi otomatis daftar siswa bermasalah (Alpa ≥ 3 hari) untuk BK & Wali Kelas.</p>
          </div>
          <div className="pillar-card-footer">
            <button className="btn-preview" onClick={() => handleOpenPreview('attendance-recap', 'Pratinjau Presensi Kelas & Red Flag')}>
              <span className="material-symbols-outlined">visibility</span> Pratinjau Data
            </button>
            <div className="btn-group">
              <button className="btn-export pdf" onClick={() => handleExportPDF('attendance-recap', 'LAPORAN REKAPITULASI PRESENSI & RED FLAG SISWA')}>
                <span className="material-symbols-outlined">picture_as_pdf</span> PDF
              </button>
              <button className="btn-export excel" onClick={() => handleExportExcel('attendance-recap')}>
                <span className="material-symbols-outlined">table_chart</span> Excel
              </button>
            </div>
          </div>
        </div>

        {/* PILAR 3: USER MANAGEMENT & ROMBEL */}
        <div className="pillar-card users">
          <div className="pillar-card-header">
            <div className="pillar-icon users">
              <span className="material-symbols-outlined">groups</span>
            </div>
            <div className="pillar-tags">
              <span className="tag">Master User</span>
              <span className="tag">Rombel Kelas</span>
            </div>
          </div>
          <div className="pillar-card-body">
            <h3>👥 3. Rekap Pengguna & Manajemen Akun (Rombel)</h3>
            <p>Pengelompokan jumlah siswa aktif per kelas (rombel), data induk guru pengampu, serta analisis keaktifan login pengguna LMS.</p>
          </div>
          <div className="pillar-card-footer">
            <button className="btn-preview" onClick={() => handleOpenPreview('user-management', 'Pratinjau Data Master User & Rombel')}>
              <span className="material-symbols-outlined">visibility</span> Pratinjau Data
            </button>
            <div className="btn-group">
              <button className="btn-export pdf" onClick={() => handleExportPDF('user-management', 'LAPORAN REKAPITULASI AKUN PENGGUNA & ROMBEL')}>
                <span className="material-symbols-outlined">picture_as_pdf</span> PDF
              </button>
              <button className="btn-export excel" onClick={() => handleExportExcel('user-management')}>
                <span className="material-symbols-outlined">table_chart</span> Excel
              </button>
            </div>
          </div>
        </div>

        {/* PILAR 4: EVALUASI & CBT */}
        <div className="pillar-card cbt">
          <div className="pillar-card-header">
            <div className="pillar-icon cbt">
              <span className="material-symbols-outlined">fact_check</span>
            </div>
            <div className="pillar-tags">
              <span className="tag">Partisipasi Ujian</span>
              <span className="tag">Koreksi Guru</span>
            </div>
          </div>
          <div className="pillar-card-body">
            <h3>📝 4. Rekap Evaluasi & Pelaksanaan Ujian (CBT / Asesmen)</h3>
            <p>Rekapitulasi partisipasi pengerjaan tugas & ujian siswa, persentase koreksi nilai oleh guru, serta ekspor nilai murni CBT.</p>
          </div>
          <div className="pillar-card-footer">
            <button className="btn-preview" onClick={() => handleOpenPreview('evaluations', 'Pratinjau Evaluasi Ujian & Tugas')}>
              <span className="material-symbols-outlined">visibility</span> Pratinjau Data
            </button>
            <div className="btn-group">
              <button className="btn-export pdf" onClick={() => handleExportPDF('evaluations', 'LAPORAN REKAPITULASI EVALUASI UJIAN & TUGAS')}>
                <span className="material-symbols-outlined">picture_as_pdf</span> PDF
              </button>
              <button className="btn-export excel" onClick={() => handleExportExcel('evaluations')}>
                <span className="material-symbols-outlined">table_chart</span> Excel
              </button>
            </div>
          </div>
        </div>

        {/* PILAR 5: AUDIT TRAIL & LOG AKSES */}
        <div className="pillar-card audit">
          <div className="pillar-card-header">
            <div className="pillar-icon audit">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div className="pillar-tags">
              <span className="tag">Audit Security</span>
              <span className="tag">Activity Log</span>
            </div>
          </div>
          <div className="pillar-card-body">
            <h3>🛡️ 5. Rekap Sistem & Audit Trail (Pengawasan)</h3>
            <p>Catatan audit trail riwayat aksi pengguna, perubahan data sensitif, waktu login, dan log keamanan platform LMS.</p>
          </div>
          <div className="pillar-card-footer">
            <button className="btn-preview" onClick={() => handleOpenPreview('audit-trail', 'Pratinjau Audit Trail & Log Sistem')}>
              <span className="material-symbols-outlined">visibility</span> Pratinjau Data
            </button>
            <div className="btn-group">
              <button className="btn-export pdf" onClick={() => handleExportPDF('audit-trail', 'LAPORAN REKAPITULASI AUDIT TRAIL KEAMANAN SISTEM')}>
                <span className="material-symbols-outlined">picture_as_pdf</span> PDF
              </button>
              <button className="btn-export excel" onClick={() => handleExportExcel('audit-trail')}>
                <span className="material-symbols-outlined">table_chart</span> Excel
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* RECENT AUDIT TRAIL TABLE */}
      <div className="recent-activity-section">
        <div className="activity-section-header">
          <div>
            <h3>🛡️ Riwayat Aktivitas Audit Trail Terkini</h3>
            <p>Daftar 8 aksi terakhir yang dilakukan di dalam sistem</p>
          </div>
          <button className="btn-view-all" onClick={() => handleOpenPreview('audit-trail', 'Seluruh Log Audit Trail')}>
            Lihat Semua Log <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="activity-table-wrapper">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aktivitas</th>
                <th>Detail Rincian</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.length > 0 ? (
                recentActivities.map((act, i) => (
                  <tr key={i}>
                    <td><span className="time-badge">{act.time}</span></td>
                    <td><strong>{act.user}</strong></td>
                    <td><span className="action-tag">{act.action}</span></td>
                    <td className="detail-cell">{act.detail}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-cell">Belum ada catatan aktivitas log audit.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PREVIEW MODAL */}
      {previewModal && (
        <div className="reports-modal-overlay">
          <div className="reports-modal-container">
            <div className="reports-modal-header">
              <h3>{previewTitle}</h3>
              <button className="btn-close" onClick={() => setPreviewModal(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="reports-modal-body">
              {loadingPreview ? (
                <div className="preview-loading">
                  <div className="spinner"></div>
                  <p>Memproses agregasi data laporan...</p>
                </div>
              ) : previewData ? (
                <div className="preview-content">
                  
                  {/* PRATINJAU LEGER AKADEMIK */}
                  {previewType === 'academic-master' && (
                    <div>
                      <div className="preview-stat-bar">
                        <span>Total Siswa: <strong>{previewData.total_students}</strong></span>
                        <span>Tahun Ajaran: <strong>{previewData.academic_year}</strong></span>
                      </div>
                      <div className="table-responsive">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>NIS</th>
                              <th>Nama Siswa</th>
                              <th>Kelas</th>
                              <th>Rata-Rata</th>
                              <th>Status Ketuntasan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData.students_leger || []).map((s, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{s.nis}</td>
                                <td><strong>{s.name}</strong></td>
                                <td>{s.class_name}</td>
                                <td><strong>{s.avg_score}</strong></td>
                                <td>
                                  <span className={`status-pill ${s.is_tuntas ? 'tuntas' : 'belum'}`}>
                                    {s.is_tuntas ? 'TUNTAS' : 'BELUM TUNTAS'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PRATINJAU PRESENSI & RED FLAG */}
                  {previewType === 'attendance-recap' && (
                    <div>
                      <h4 className="preview-subtitle">Daftar Siswa Red Flag (Alpa ≥ 3 / Perlu Perhatian BK)</h4>
                      <div className="table-responsive mb-4">
                        <table className="preview-table redflag">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>NIS</th>
                              <th>Nama Siswa</th>
                              <th>Kelas</th>
                              <th>Total Alpa</th>
                              <th>Orang Tua / Wali</th>
                              <th>Kontak HP</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData.red_flag_students || []).length > 0 ? (
                              (previewData.red_flag_students || []).map((s, idx) => (
                                <tr key={idx}>
                                  <td>{idx + 1}</td>
                                  <td>{s.nis}</td>
                                  <td><strong>{s.name}</strong></td>
                                  <td>{s.class_name}</td>
                                  <td><span className="alpa-count">{s.alpa} Hari</span></td>
                                  <td>{s.parent_name}</td>
                                  <td>{s.parent_phone}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="7" className="empty-cell">Tidak ada siswa dengan catatan Alpa tinggi. Seluruh siswa disiplin!</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <h4 className="preview-subtitle">Ringkasan Kehadiran Kelas</h4>
                      <div className="table-responsive">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>Kelas</th>
                              <th>Jumlah Siswa</th>
                              <th>Hadir</th>
                              <th>Sakit</th>
                              <th>Izin</th>
                              <th>Alpa</th>
                              <th>% Kehadiran</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData.class_summary || []).map((c, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td><strong>{c.class_name}</strong></td>
                                <td>{c.total_students}</td>
                                <td>{c.hadir}</td>
                                <td>{c.sakit}</td>
                                <td>{c.izin}</td>
                                <td>{c.alpa}</td>
                                <td><strong>{c.pct_hadir}%</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PRATINJAU USER MANAGEMENT */}
                  {previewType === 'user-management' && (
                    <div>
                      <div className="preview-stat-bar">
                        <span>Total Siswa: <strong>{previewData.total_students}</strong></span>
                        <span>Total Guru: <strong>{previewData.total_teachers}</strong></span>
                        <span>Total Orang Tua: <strong>{previewData.total_parents}</strong></span>
                      </div>
                      <div className="table-responsive">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>Nama Kelas (Rombel)</th>
                              <th>Jumlah Siswa Terdaftar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData.rombel_summary || []).map((r, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td><strong>Kelas {r.class_name}</strong></td>
                                <td>{r.student_count} Siswa</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PRATINJAU EVALUASI */}
                  {previewType === 'evaluations' && (
                    <div>
                      <div className="preview-stat-bar">
                        <span>Total Tugas: <strong>{previewData.total_assignments}</strong></span>
                        <span>Total Pengerjaan: <strong>{previewData.total_submissions}</strong></span>
                      </div>
                      <div className="table-responsive">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>Judul Tugas / Evaluasi</th>
                              <th>Kelas Target</th>
                              <th>Total Pengumpulkan</th>
                              <th>Sudah Dinilai</th>
                              <th>Belum Dinilai</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData.evaluations || []).map((e, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td><strong>{e.title}</strong></td>
                                <td>{e.class_name}</td>
                                <td>{e.total_submissions}</td>
                                <td><span className="text-success">{e.total_graded}</span></td>
                                <td><span className="text-warning">{e.total_pending}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PRATINJAU AUDIT TRAIL */}
                  {previewType === 'audit-trail' && (
                    <div>
                      <div className="table-responsive">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>No</th>
                              <th>Stempel Waktu</th>
                              <th>Pengguna</th>
                              <th>Aktivitas</th>
                              <th>Detail Rincian</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData.logs || []).map((l, idx) => (
                              <tr key={idx}>
                                <td>{l.no}</td>
                                <td>{l.time}</td>
                                <td><strong>{l.user}</strong></td>
                                <td><span className="action-tag">{l.action}</span></td>
                                <td>{l.detail}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              ) : null}
            </div>

            <div className="reports-modal-footer">
              <button className="btn-secondary" onClick={() => setPreviewModal(false)}>Tutup Pratinjau</button>
              <button className="btn-export pdf" onClick={() => handleExportPDF(previewType, previewTitle)}>
                <span className="material-symbols-outlined">picture_as_pdf</span> Cetak PDF (KOP)
              </button>
              <button className="btn-export excel" onClick={() => handleExportExcel(previewType)}>
                <span className="material-symbols-outlined">table_chart</span> Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;