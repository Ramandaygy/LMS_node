import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-reports.css';

const AdminReports = () => {
  const [stats, setStats] = useState({
    total_students: 0,
    total_teachers: 0,
    total_courses: 0,
    total_parents: 0,
    active_today: 0
  });
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('students');
  const [dateRange, setDateRange] = useState('month');
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await api.get('/dashboard/activities');
      const logs = response.data.data || [];
      const list = logs.map(l => {
        const date = new Date(l.created_at);
        let timeStr = 'Baru saja';
        const diffMs = new Date() - date;
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin > 0) {
          if (diffMin < 60) {
            timeStr = `${diffMin} menit lalu`;
          } else {
            const diffHour = Math.floor(diffMin / 60);
            if (diffHour < 24) {
              timeStr = `${diffHour} jam lalu`;
            } else {
              timeStr = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            }
          }
        }

        let icon = 'settings';
        if (l.action.includes('Registrasi') || l.action.includes('Import')) {
          icon = 'person_add';
        } else if (l.action.includes('Kenaikan')) {
          icon = 'school';
        } else if (l.action.includes('Hapus')) {
          icon = 'person_remove';
        }

        return {
          id: l._id,
          time: timeStr,
          user: l.user_name || 'System',
          action: l.action,
          detail: l.detail,
          icon
        };
      });
      
      setRecentActivities(list.slice(0, 10));
    } catch (e) {
      console.error('Failed to fetch recent activities:', e);
      setRecentActivities([
        { id: 1, time: '10 menit lalu', user: 'Admin', action: 'Sistem Inisialisasi', detail: 'Aktivitas logging siap digunakan', icon: 'settings' }
      ]);
    }
  };

  const handleExportExcel = async (type) => {
    try {
      let endpoint = '';
      let filename = '';
      if (type === 'students') {
        endpoint = '/export-import/export/students';
        filename = 'laporan_siswa.xlsx';
      } else if (type === 'teachers') {
        endpoint = '/export-import/export/teachers';
        filename = 'laporan_guru.xlsx';
      } else if (type === 'courses') {
        endpoint = '/export-import/export/schedules';
        filename = 'laporan_penugasan_guru.xlsx';
      } else if (type === 'activity') {
        endpoint = '/export-import/export/activities';
        filename = 'laporan_aktivitas_pengguna.xlsx';
      }

      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Gagal mendownload laporan Excel');
    }
  };

  const handleExportPDF = async (type) => {
    try {
      let title = '';
      let headers = [];
      let rows = [];

      if (type === 'students') {
        const [res, classesRes, parentsRes] = await Promise.all([
          api.get('/users/students/all'),
          api.get('/classes'),
          api.get('/users/parents')
        ]);
        const students = res.data.data || [];
        const classesList = classesRes.data.data || [];
        const parentsList = parentsRes.data.parents || [];

        const classMap = {};
        classesList.forEach(c => classMap[c._id] = c.name);

        const parentMap = {};
        parentsList.forEach(p => parentMap[p._id] = p.full_name);

        title = 'LAPORAN DATA INDUK SISWA';
        headers = ['No', 'NIS', 'Nama Lengkap', 'Kelas', 'Orang Tua / Wali', 'Status'];
        rows = students.map((s, i) => {
          const classId = s.class_id?._id || s.class_id;
          const parentId = s.parent_id?._id || s.parent_id;
          return [
            i + 1,
            s.nis || '-',
            s.full_name || '-',
            classMap[classId] || '-',
            parentMap[parentId] || '-',
            s.status === 'active' ? 'Aktif' : 'Nonaktif'
          ];
        });
      } else if (type === 'teachers') {
        const [res, subjectsRes] = await Promise.all([
          api.get('/users/teachers/all'),
          api.get('/subjects')
        ]);
        const teachers = res.data.data || [];
        const subjectsList = subjectsRes.data.data || [];

        const subjectMap = {};
        subjectsList.forEach(s => subjectMap[s._id] = s.name);

        title = 'LAPORAN DATA TENAGA PENDIDIK (GURU)';
        headers = ['No', 'NIP', 'Nama Lengkap', 'Kode Guru', 'Mata Pelajaran', 'Telepon'];
        rows = teachers.map((t, i) => {
          const mappedSubs = (t.subjects || t.subject_ids || [])
            .map(subId => subjectMap[subId] || subId)
            .join(', ') || '-';
          return [
            i + 1,
            t.nip || '-',
            t.full_name || '-',
            t.teacher_code || t.username || '-',
            mappedSubs,
            t.phone || '-'
          ];
        });
      } else if (type === 'courses') {
        const res = await api.get('/schedules');
        const schedules = res.data.data || [];
        title = 'LAPORAN PENUGASAN MENGAJAR GURU';
        headers = ['No', 'Hari', 'Jam Ke', 'Waktu', 'Kelas', 'Mata Pelajaran', 'Guru Pengajar', 'Ruangan'];
        rows = schedules.map((s, i) => [
          i + 1,
          s.day || '-',
          s.time_slot || '-',
          (s.start_time && s.end_time) ? `${s.start_time}-${s.end_time}` : '-',
          s.class_id?.name || s.class_id || '-',
          s.subject_id?.name || s.subject_id?.code || '-',
          s.teacher_id?.full_name || '-',
          s.room || '-'
        ]);
      } else if (type === 'activity') {
        const response = await api.get('/dashboard/activities');
        const logs = response.data.data || [];
        
        title = 'LAPORAN AKTIVITAS PENGGUNA SISTEM';
        headers = ['No', 'Waktu', 'Pengguna', 'Aktivitas', 'Detail'];
        rows = logs.slice(0, 100).map((act, i) => {
          const date = new Date(act.created_at);
          const time_formatted = date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
          return [
            i + 1,
            time_formatted,
            act.user_name || 'System',
            act.action,
            act.detail
          ];
        });
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
              body { margin: 1.5cm; font-family: 'Times New Roman', Times, serif; color: #000; font-size: 12pt; }
              @page { size: A4; margin: 1.5cm; }
            }
            body { font-family: 'Arial', sans-serif; padding: 20px; color: #333; line-height: 1.4; }
            
            /* Kop Surat Styles */
            .kop-container { display: flex; align-items: center; border-bottom: 4px double #000; padding-bottom: 12px; margin-bottom: 24px; }
            .kop-logo { width: 80px; height: auto; margin-right: 20px; }
            .kop-text { text-align: center; flex-grow: 1; }
            .kop-text h4 { margin: 0; font-size: 13pt; font-weight: normal; text-transform: uppercase; letter-spacing: 0.5px; }
            .kop-text h3 { margin: 2px 0; font-size: 16pt; font-weight: bold; text-transform: uppercase; }
            .kop-text p { margin: 2px 0; font-size: 9.5pt; font-style: italic; color: #555; }
            
            /* Title Styles */
            .doc-title { text-align: center; font-size: 14pt; font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-transform: uppercase; }
            
            /* Table Styles */
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10.5pt; }
            th, td { border: 1px solid #000; padding: 8px 10px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; text-transform: uppercase; font-size: 10pt; }
            tr:nth-child(even) { background-color: #fafafa; }
            .text-center { text-align: center; }
            
            /* Signature Styles */
            .sig-container { margin-top: 50px; display: flex; justify-content: flex-end; font-size: 11pt; page-break-inside: avoid; }
            .sig-box { text-align: center; width: 250px; }
            .sig-space { height: 75px; }
            .sig-name { font-weight: bold; text-decoration: underline; }
          </style>
        </head>
        <body>
          <!-- Kop Surat -->
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
          
          <!-- Judul Laporan -->
          <div class="doc-title">${title}</div>
          
          <!-- Tabel Data -->
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
                    <td class="${idx === 0 || idx === 1 || idx === 5 ? 'text-center' : ''}">${cell}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <!-- Tanda Tangan -->
          <div class="sig-container">
            <div class="sig-box">
              <p>Suradadi, ${today}</p>
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div class="sig-space"></div>
              <p class="sig-name">....................................................</p>
              <p>NIP. .............................................</p>
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
      alert('Gagal membuat laporan PDF');
    }
  };

  if (loading) return <div className="reports-loading">Memuat dashboard...</div>;

  return (
    <div className="reports-container">
      {/* Page Header */}
      <div className="reports-header">
        <div>
          <span className="reports-badge">Analytics & Insights</span>
          <h2 className="reports-title">Laporan Statistik</h2>
          <p className="reports-subtitle">Pantau performa dan aktivitas sekolah secara real-time</p>
        </div>
        <div className="reports-actions">
          <button className="reports-export-btn" onClick={() => handleExportPDF(reportType)}>
            <span className="material-symbols-outlined">picture_as_pdf</span>
            Export PDF
          </button>
          <button className="reports-export-btn secondary" onClick={() => handleExportExcel(reportType)}>
            <span className="material-symbols-outlined">table_chart</span>
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="reports-filters">
        <div className="filter-group">
          <label>Tipe Laporan</label>
          <div className="filter-select">
            <span className="material-symbols-outlined">analytics</span>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="students">Laporan Siswa</option>
              <option value="teachers">Laporan Guru</option>
              <option value="courses">Laporan Penugasan Guru</option>
              <option value="activity">Laporan Aktivitas</option>
            </select>
          </div>
        </div>
        <div className="filter-group">
          <label>Periode</label>
          <div className="filter-select">
            <span className="material-symbols-outlined">calendar_today</span>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
              <option value="week">Minggu Ini</option>
              <option value="month">Bulan Ini</option>
              <option value="year">Tahun Ini</option>
            </select>
          </div>
        </div>
        <button className="reports-apply-btn" onClick={() => handleExportPDF(reportType)}>
          <span className="material-symbols-outlined">refresh</span>
          Terapkan Filter
        </button>
      </div>

      {/* Report Modules Grid */}
      <div className="reports-modules-grid">
        <div className="report-module-card">
          <div className="module-icon academic">
            <span className="material-symbols-outlined">school</span>
          </div>
          <div className="module-content">
            <h3>Laporan Data Siswa</h3>
            <p>Export dan lihat daftar lengkap siswa yang terdaftar di sistem.</p>
            <button className="module-action-btn" onClick={() => handleExportPDF('students')}>Buat Laporan</button>
          </div>
        </div>
        
        <div className="report-module-card">
          <div className="module-icon attendance">
            <span className="material-symbols-outlined">person_pin</span>
          </div>
          <div className="module-content">
            <h3>Laporan Data Guru</h3>
            <p>Daftar seluruh profil guru pengajar beserta status keaktifannya.</p>
            <button className="module-action-btn" onClick={() => handleExportPDF('teachers')}>Buat Laporan</button>
          </div>
        </div>

        <div className="report-module-card">
          <div className="module-icon finance">
            <span className="material-symbols-outlined">assignment_ind</span>
          </div>
          <div className="module-content">
            <h3>Laporan Penugasan Guru</h3>
            <p>Data lengkap mengenai pembagian tugas mengajar guru per kelas.</p>
            <button className="module-action-btn" onClick={() => handleExportPDF('courses')}>Buat Laporan</button>
          </div>
        </div>

        <div className="report-module-card">
          <div className="module-icon users">
            <span className="material-symbols-outlined">manage_accounts</span>
          </div>
          <div className="module-content">
            <h3>Laporan Aktivitas Pengguna</h3>
            <p>Rekapitulasi log aktivitas yang dilakukan oleh semua pengguna.</p>
            <button className="module-action-btn" onClick={() => handleExportPDF('activity')}>Buat Laporan</button>
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="recent-activity">
        <div className="activity-header">
          <h3>Aktivitas Terbaru</h3>
          <button className="view-all-btn" onClick={() => handleExportPDF('activity')}>
            Lihat Semua
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
        <div className="activity-table-container">
          <table className="activity-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Pengguna</th>
                <th>Aktivitas</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {recentActivities.map((activity) => (
                <tr key={activity.id}>
                  <td>
                    <div className="activity-time">
                      <span className="material-symbols-outlined">schedule</span>
                      {activity.time}
                    </div>
                  </td>
                  <td>
                    <div className="activity-user">
                      <div className="user-avatar">
                        <span className="material-symbols-outlined">account_circle</span>
                      </div>
                      {activity.user}
                    </div>
                  </td>
                  <td>
                    <div className="activity-action">
                      <span className="material-symbols-outlined">{activity.icon}</span>
                      {activity.action}
                    </div>
                  </td>
                  <td className="activity-detail">{activity.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Section */}
      <div className="reports-export-section">
        <div className="export-content">
          <span className="material-symbols-outlined">download</span>
          <div>
            <h4>Unduh Laporan Lengkap</h4>
            <p>Dapatkan data lengkap dalam format PDF atau Excel untuk keperluan arsip</p>
          </div>
        </div>
        <div className="export-buttons">
          <button className="export-btn pdf" onClick={() => handleExportPDF(reportType)}>
            <span className="material-symbols-outlined">picture_as_pdf</span>
            PDF
          </button>
          <button className="export-btn excel" onClick={() => handleExportExcel(reportType)}>
            <span className="material-symbols-outlined">table_chart</span>
            Excel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;