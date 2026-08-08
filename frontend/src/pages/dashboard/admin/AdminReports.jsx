import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-reports.css';

const AdminReports = () => {
  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('genap');
  const [selectedYear, setSelectedYear] = useState('');
  const [academicYears, setAcademicYears] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  
  // Modal Preview States
  const [previewModal, setPreviewModal] = useState(false);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Active category tab
  const [activeCategory, setActiveCategory] = useState('academic');

  useEffect(() => {
    fetchInitialData();
    fetchAcademicYears();
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

  const fetchAcademicYears = async () => {
    try {
      const response = await api.get('/academic-years');
      const years = response.data.academic_years || [];
      setAcademicYears(years);
      const active = years.find(y => y.is_active);
      if (active) setSelectedYear(active._id);
    } catch (err) {
      console.error('Error fetching academic years:', err);
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
      const params = new URLSearchParams();
      if (selectedClass !== 'all') params.append('class_id', selectedClass);
      if (selectedYear) params.append('academic_year_id', selectedYear);
      if (selectedSemester) params.append('semester', selectedSemester);

      const queryString = params.toString();
      
      if (type === 'leger') {
        endpoint = `/admin/monitoring/leger${queryString ? '?' + queryString : ''}`;
      } else if (type === 'teacher-load') {
        endpoint = `/admin/monitoring/teachers${queryString ? '?' + queryString : ''}`;
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
  const handleExportExcel = async (type, title) => {
    try {
      let endpoint = `/admin/export/${type}`;
      const params = new URLSearchParams();
      if (selectedClass !== 'all') params.append('class_id', selectedClass);
      if (selectedYear) params.append('academic_year_id', selectedYear);
      if (selectedSemester) params.append('semester', selectedSemester);
      
      const queryString = params.toString();
      if (queryString) endpoint += `?${queryString}`;
      
      const response = await api.get(endpoint, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
  // PDF PRINT HANDLER
  // -------------------------------------------------------------
  const handleExportPDF = async (type, titleName, reportData = null) => {
    try {
      let title = titleName || 'LAPORAN REKAPITULASI SEKOLAH';
      let headers = [];
      let rows = [];
      let data = reportData;

      // Jika data tidak diberikan, ambil dari API
      if (!data) {
        const params = new URLSearchParams();
        if (selectedClass !== 'all') params.append('class_id', selectedClass);
        if (selectedYear) params.append('academic_year_id', selectedYear);
        if (selectedSemester) params.append('semester', selectedSemester);
        const queryString = params.toString();
        
        const res = await api.get(`/admin/reports/${type}${queryString ? '?' + queryString : ''}`);
        data = res.data;
      }

      // Generate table berdasarkan type
      switch(type) {
        case 'leger':
          const legerData = data.data?.students || [];
          title = 'LAPORAN LEGER NILAI SISWA';
          headers = ['No', 'NIS', 'Nama Siswa', 'Kelas', 'Rata-Rata', 'Peringkat'];
          rows = legerData.map((st, i) => [
            i + 1,
            st.nis,
            st.full_name,
            data.data?.class_info?.name || '-',
            st.avgRapor,
            st.rank
          ]);
          break;
        case 'teacher-load':
          const teacherData = data.data || [];
          title = 'LAPORAN DATA GURU & BEBAN MENGAJAR';
          headers = ['No', 'NIP', 'Nama Guru', 'Mapel', 'Kelas', 'Siswa Binaan'];
          rows = teacherData.map((g, i) => [
            i + 1,
            g.nip || '-',
            g.full_name,
            g.assigned_subjects?.join(', ') || '-',
            g.assigned_classes?.join(', ') || '-',
            g.total_students_taught || 0
          ]);
          break;
        default:
          headers = ['No', 'Data'];
          rows = [];
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
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
            .header h2 { margin: 0; font-size: 16pt; }
            .header h1 { margin: 5px 0; font-size: 18pt; }
            .header p { margin: 2px 0; font-size: 11pt; }
            .title { text-align: center; font-size: 14pt; font-weight: bold; margin: 20px 0; text-decoration: underline; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
            th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; }
            th { background: #f0f0f0; font-weight: bold; text-align: center; }
            .text-center { text-align: center; }
            .footer { margin-top: 40px; display: flex; justify-content: flex-end; }
            .signature { text-align: center; width: 230px; }
            .sig-space { height: 50px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>PEMERINTAH KABUPATEN TEGAL</h2>
            <h2>DINAS PENDIDIKAN DAN KEBUDAYAAN</h2>
            <h1>SMP NEGERI 1 SURADADI</h1>
            <p>Jl. Raya Purwahamba No. 76, Suradadi, Kab. Tegal 52182</p>
            <p>Email: smpn1suradadi@sch.id | Website: smpn1suradadi.sch.id</p>
          </div>
          
          <div class="title">${title}</div>
          
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
                    <td class="${idx === 0 || idx === row.length - 1 ? 'text-center' : ''}">${cell}</td>
                  `).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <div class="signature">
              <p>Suradadi, ${today}</p>
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div class="sig-space"></div>
              <p><strong>SUHARTO, S.Pd.,M.M.</strong></p>
              <p>NIP. 19671022 199401 1 001</p>
            </div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
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

  // ============================================================
  // RENDER CATEGORY TABS
  // ============================================================
  const renderCategoryTabs = () => {
    const categories = [
      { id: 'academic', label: '📖 Akademik & Kenaikan Kelas', icon: 'military_tech' },
      { id: 'teachers', label: '👨‍🏫 Ketenagaan (Guru)', icon: 'person' }
    ];

    return (
      <div className="report-category-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span className="material-symbols-outlined">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>
    );
  };

  // ============================================================
  // RENDER REPORT CARDS BY CATEGORY
  // ============================================================
  const renderReportCards = () => {
    const reports = {
      academic: [
        { id: 'leger', label: 'Leger Nilai & Kenaikan Kelas', desc: 'Rekapitulasi lengkap nilai akhir siswa, ketuntasan, KKM, dan penentuan kenaikan kelas.' }
      ],
      teachers: [
        { id: 'teacher-load', label: 'Beban Mengajar Guru', desc: 'Laporan data guru, bidang tugas, dan total jam tatap muka (JP) mengajar.' }
      ]
    };

    const currentReports = reports[activeCategory] || [];

    return (
      <div className="reports-pillars-grid">
        {currentReports.map((report) => (
          <div key={report.id} className="pillar-card">
            <div className="pillar-card-header">
              <div className={`pillar-icon ${activeCategory}`}>
                <span className="material-symbols-outlined">
                  {activeCategory === 'academic' && 'military_tech'}
                  {activeCategory === 'teachers' && 'person'}
                </span>
              </div>
              <div className="pillar-tags">
                <span className="tag">
                  {activeCategory === 'academic' && 'Akademik'}
                  {activeCategory === 'teachers' && 'Guru'}
                </span>
              </div>
            </div>
            <div className="pillar-card-body">
              <h3>{report.label}</h3>
              <p>{report.desc}</p>
            </div>
            <div className="pillar-card-footer">
              <button className="btn-preview" onClick={() => handleOpenPreview(report.id, `📊 Pratinjau: ${report.label}`)}>
                <span className="material-symbols-outlined">visibility</span> Pratinjau
              </button>
              <div className="btn-group">
                <button className="btn-export pdf" onClick={() => handleExportPDF(report.id, report.label.toUpperCase())}>
                  <span className="material-symbols-outlined">picture_as_pdf</span>
                </button>
                <button className="btn-export excel" onClick={() => handleExportExcel(report.id, report.label)}>
                  <span className="material-symbols-outlined">table_chart</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="reports-loading-screen">
        <div className="spinner"></div>
        <p>Memuat Dashboard Rekapitulasi Laporan...</p>
      </div>
    );
  }

  return (
    <div className="reports-container">
      {/* Page Header */}
      <div className="reports-header">
        <div>
          <span className="reports-badge">📊 Executive Reporting</span>
          <h2 className="reports-title">Pusat Laporan & Rekapitulasi Sekolah</h2>
          <p className="reports-subtitle">Rekapitulasi data akademik, ketenagaan, kesiswaan, presensi, pembelajaran, dan audit sistem</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="reports-filters-toolbar">
        <div className="filter-item">
          <label><span className="material-symbols-outlined">class</span> Filter Kelas</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="all">📚 Semua Kelas</option>
            {classesList.map(c => (
              <option key={c._id} value={c._id}>Kelas {c.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label><span className="material-symbols-outlined">date_range</span> Tahun Ajaran</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
            {academicYears.map(y => (
              <option key={y._id} value={y._id}>{y.year} {y.is_active ? '(Aktif)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label><span className="material-symbols-outlined">semester</span> Semester</label>
          <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
            <option value="ganjil">Ganjil</option>
            <option value="genap">Genap</option>
          </select>
        </div>
      </div>

      {/* Category Tabs */}
      {renderCategoryTabs()}

      {/* Report Cards */}
      {renderReportCards()}

      {/* ============================================================
          PREVIEW MODAL
          ============================================================ */}
      {previewModal && (
        <div className="reports-modal-overlay" onClick={() => setPreviewModal(false)}>
          <div className="reports-modal-container" onClick={(e) => e.stopPropagation()}>
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
                  <p>Memproses data laporan...</p>
                </div>
              ) : previewData ? (
                <div className="preview-content">
                  
                  {/* PRATINJAU LEGER NILAI */}
                  {previewType === 'leger' && (
                    <div>
                      <div className="preview-stat-bar">
                        <span>📚 Total Siswa: <strong>{previewData.total_students || 0}</strong></span>
                        <span>📅 Tahun: <strong>{previewData.academic_year || '2025/2026'}</strong></span>
                      </div>
                      <div className="table-responsive">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>NIS</th>
                              <th>Nama Siswa</th>
                              <th>Kelas</th>
                              <th>Rata-Rata</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData?.data?.students || []).map((s, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{s.nis || '-'}</td>
                                <td><strong>{s.full_name}</strong></td>
                                <td>{previewData?.data?.class_info?.name || '-'}</td>
                                <td><span className="jp-badge">{s.avgRapor}</span></td>
                                <td>
                                  <span className={`status-pill tuntas`}>
                                    Peringkat {s.rank}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* PRATINJAU DATA GURU & BEBAN MENGAJAR */}
                  {previewType === 'teacher-load' && (
                    <div>
                      <div className="preview-stat-bar">
                        <span>👨‍🏫 Total Guru: <strong>{previewData.total_teachers || 0}</strong></span>
                        <span>📋 Total JP: <strong>{previewData.total_jp || 0}</strong></span>
                      </div>
                      <div className="table-responsive">
                        <table className="preview-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>NIP</th>
                              <th>Nama Guru</th>
                              <th>Mapel</th>
                              <th>Kelas</th>
                              <th>Siswa Binaan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(previewData.data || []).map((g, idx) => (
                              <tr key={idx}>
                                <td>{idx + 1}</td>
                                <td>{g.nip || '-'}</td>
                                <td><strong>{g.full_name}</strong></td>
                                <td>{g.assigned_subjects?.join(', ') || '-'}</td>
                                <td>{g.assigned_classes?.join(', ') || '-'}</td>
                                <td><span className="jp-badge">{g.total_students_taught || 0} Siswa</span></td>
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
              <button className="btn-secondary" onClick={() => setPreviewModal(false)}>Tutup</button>
              <button className="btn-export pdf" onClick={() => handleExportPDF(previewType, previewTitle, previewData)}>
                <span className="material-symbols-outlined">picture_as_pdf</span> PDF
              </button>
              <button className="btn-export excel" onClick={() => handleExportExcel(previewType)}>
                <span className="material-symbols-outlined">table_chart</span> Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;