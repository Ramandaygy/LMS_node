import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const OrtuReports = () => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [progress, setProgress] = useState(null);
  const [subjectGrades, setSubjectGrades] = useState([]);
  const [raporData, setRaporData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [parentFeedback, setParentFeedback] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const isMulokSubject = (name) => {
    const n = (name || '').toLowerCase();
    return n.includes('muatan lokal') || n.includes('mulok') || n.includes('bahasa jawa') || n.includes('bahasa daerah');
  };

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/ortu/children');
      const kids = res.data.children || [];
      setChildren(kids);
      if (kids.length > 0) {
        setSelectedChild(kids[0]);
        fetchReportData(kids[0].id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching children:', err);
      setLoading(false);
    }
  };

  const fetchReportData = async (childId) => {
    try {
      setLoading(true);
      let newestDate = null;
      
      // Fetch progress
      const progRes = await api.get(`/progress/ortu/children/${childId}`);
      setProgress(progRes.data.data);

      // Fetch master subjects list so all subjects show up even if grades aren't uploaded yet
      let masterSubjects = [];
      try {
        const subjRes = await api.get('/subjects');
        masterSubjects = subjRes.data.data || subjRes.data.subjects || subjRes.data || [];
      } catch (subjErr) {
        console.warn('Gagal memuat master mata pelajaran, menggunakan data tugas:', subjErr);
      }

      // Fetch official Rapor
      try {
        const rapRes = await api.get(`/rapor/student/${childId}`);
        if (rapRes.data.success && rapRes.data.data) {
          setRaporData(rapRes.data.data);
          setParentFeedback(rapRes.data.data.parent_feedback || '');
          if (rapRes.data.data.updatedAt) {
            newestDate = new Date(rapRes.data.data.updatedAt);
          }
        } else {
          setRaporData(null);
          setParentFeedback('');
        }
      } catch (rapErr) {
        console.warn('Rapor resmi tidak ditemukan, menggunakan kalkulasi otomatis:', rapErr);
        setRaporData(null);
        setParentFeedback('');
      }

      // Fetch assignments & grades
      const assignRes = await api.get(`/assignments/ortu/children/${childId}`);
      const assignments = assignRes.data.data || [];
      
      // Group assignments by subject & track latest date
      const subjectMap = {};
      assignments.forEach(a => {
        const subj = a.subject_name || a.subject?.name || 'Lainnya';
        if (!subjectMap[subj]) {
          subjectMap[subj] = { totalScore: 0, count: 0, latestDate: null };
        }
        if (a.score !== null && a.score !== undefined) {
          subjectMap[subj].totalScore += a.score;
          subjectMap[subj].count += 1;
        }

        const aDate = a.updatedAt || a.updated_at || a.createdAt || a.created_at;
        if (aDate) {
          const d = new Date(aDate);
          if (!newestDate || d > newestDate) {
            newestDate = d;
          }
        }
      });

      // Combine master subjects and assignment subjects
      const allSubjectNamesSet = new Set();
      masterSubjects.forEach(s => {
        if (s.name) allSubjectNamesSet.add(s.name);
      });
      Object.keys(subjectMap).forEach(subj => allSubjectNamesSet.add(subj));

      // Fallback default subjects if both are empty
      if (allSubjectNamesSet.size === 0) {
        [
          'Pendidikan Agama Islam', 'Pancasila', 'Bahasa Indonesia', 'Matematika', 
          'Ilmu Pengetahuan Alam', 'Ilmu Pengetahuan Sosial', 'Bahasa Inggris', 
          'Pendidikan Jasmani, Olahraga & Kesehatan', 'Informatika', 'Seni Budaya', 'Muatan Lokal Bahasa Daerah'
        ].forEach(s => allSubjectNamesSet.add(s));
      }

      const gradesList = Array.from(allSubjectNamesSet).map(subj => {
        const data = subjectMap[subj];
        if (data && data.count > 0) {
          const { totalScore, count } = data;
          const avg = totalScore / count;
          let gradeLetter = 'E';
          if (avg >= 85) gradeLetter = 'A';
          else if (avg >= 70) gradeLetter = 'B';
          else if (avg >= 55) gradeLetter = 'C';
          else if (avg >= 40) gradeLetter = 'D';

          let desc = 'Sangat Baik';
          if (gradeLetter === 'B') desc = 'Baik';
          else if (gradeLetter === 'C') desc = 'Cukup';
          else if (gradeLetter === 'D') desc = 'Kurang';
          else if (gradeLetter === 'E') desc = 'Sangat Kurang';

          return {
            subject: subj,
            taskCount: count,
            average: avg,
            gradeLetter,
            description: desc,
            hasScore: true
          };
        } else {
          // Empty / Pending Grade from Teacher
          return {
            subject: subj,
            taskCount: 0,
            average: null,
            gradeLetter: '-',
            description: 'Menunggu upload nilai dari guru',
            hasScore: false
          };
        }
      });

      setSubjectGrades(gradesList);
      setLastUpdated(newestDate || new Date());
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChildChange = (e) => {
    const childId = e.target.value;
    const child = children.find(c => c.id === childId);
    setSelectedChild(child);
    if (child) {
      fetchReportData(child.id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveParentFeedback = async () => {
    if (!selectedChild) return;
    try {
      setLoading(true);
      const res = await api.post(`/rapor/student/${selectedChild.id}`, {
        parent_feedback: parentFeedback
      });
      if (res.data.success) {
        alert('Tanggapan orang tua berhasil disimpan!');
        setRaporData(res.data.data);
      }
    } catch (err) {
      console.error('Error saving parent feedback:', err);
      alert('Gagal menyimpan tanggapan orang tua.');
    } finally {
      setLoading(false);
    }
  };

  const formatLastUpdated = (dateObj) => {
    if (!dateObj) return '-';
    try {
      const d = new Date(dateObj);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) + ' WIB';
    } catch (e) {
      return '-';
    }
  };

  return (
    <div className="ortu-reports-container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' }}>
      <style>
        {`
          .ortu-reports-container {
            width: 100%;
            box-sizing: border-box;
            overflow-x: hidden;
          }
          .report-table-wrapper {
            width: 100%;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            margin-bottom: 20px;
            box-sizing: border-box;
          }
          .report-table-wrapper table {
            width: 100%;
            min-width: 650px;
            border-collapse: collapse;
          }
          .report-table-wrapper table th, .report-table-wrapper table td {
            padding: 10px 12px;
            border: 1px solid #cbd5e1;
          }
          @media (max-width: 768px) {
            .ortu-reports-container {
              padding: 12px !important;
            }
            .header-action-bar {
              flex-direction: column;
              align-items: flex-start !important;
              gap: 12px;
            }
            .header-action-bar button {
              width: 100%;
              justify-content: center;
            }
            .print-area {
              padding: 16px !important;
            }
            .identity-grid {
              grid-template-columns: 1fr !important;
              gap: 10px !important;
            }
            .summary-cards-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 10px !important;
            }
            .signature-grid {
              grid-template-columns: 1fr !important;
              gap: 30px !important;
            }
          }
          @media print {
            body * { visibility: hidden !important; }
            .print-area, .print-area * { visibility: visible !important; }
            .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; border: none !important; box-shadow: none !important; }
            .no-print { display: none !important; }
            .print-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            table { width: 100% !important; min-width: 0 !important; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2 !important; -webkit-print-color-adjust: exact; }
          }
        `}
      </style>

      <div className="no-print header-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: '#0f172a', fontWeight: 'bold', margin: '0 0 8px 0' }}>Laporan Akademik</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Lihat dan cetak laporan hasil belajar anak Anda</p>
          {lastUpdated && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#0369a1', background: '#e0f2fe', padding: '4px 10px', borderRadius: '16px', marginTop: '8px', fontWeight: '500' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>update</span>
              <span>Terakhir diperbarui: <strong>{formatLastUpdated(lastUpdated)}</strong></span>
            </div>
          )}
        </div>
        <button 
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500', fontSize: '14px', transition: 'background 0.3s' }}
          onMouseOver={(e) => e.target.style.background = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.background = '#2563eb'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
          Cetak Laporan
        </button>
      </div>
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Memuat data laporan...</div>
      ) : children.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#64748b' }}>
          Tidak ada data anak yang terkait dengan akun ini.
        </div>
      ) : (
        <>
          <div className="no-print" style={{ marginBottom: '24px', background: 'white', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <label style={{ fontWeight: '600', color: '#334155' }}>Pilih Anak:</label>
            <select 
              value={selectedChild?.id || ''} 
              onChange={handleChildChange}
              style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '220px', fontSize: '14px', background: '#f8fafc', flex: '1' }}
            >
              {children.map(c => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.class_name || 'Tidak ada kelas'})</option>
              ))}
            </select>
          </div>

          {/* PRINTABLE AREA */}
          <div className="print-area" style={{ background: 'white', padding: '28px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', boxSizing: 'border-box' }}>
            
            {raporData && raporData.is_published ? (
              // OFFICIAL RAPOR FROM HOMEROOM TEACHER
              <div>
                {/* RAPOR HEADER / KOP */}
                <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #000', paddingBottom: '12px' }}>
                  <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
                    RAPOR Hasil Belajar SISWA
                  </h2>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{raporData.school_name || 'SMP NEGERI 1 SURADADI'}</div>
                  {lastUpdated && (
                    <div style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>
                      Status Data: Terakhir diperbarui pada {formatLastUpdated(lastUpdated)}
                    </div>
                  )}
                </div>

                {/* IDENTITY HEADER GRID */}
                <div className="identity-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr><td style={{ width: '120px', padding: '3px 0' }}>Nama Sekolah</td><td>: {raporData.school_name || 'SMP NEGERI 1 SURADADI'}</td></tr>
                        <tr><td style={{ padding: '3px 0' }}>Alamat</td><td>: {raporData.school_address || 'Jl. Raya Purwahamba No. 76, Suradadi, Kab. Tegal 52182'}</td></tr>
                        <tr><td style={{ padding: '3px 0' }}>Nama Siswa</td><td>: <strong>{selectedChild?.full_name}</strong></td></tr>
                        <tr><td style={{ padding: '3px 0' }}>NIS / NISN</td><td>: {selectedChild?.nis || '-'} / {raporData.student_id?.nisn || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr><td style={{ width: '120px', padding: '3px 0' }}>Kelas</td><td>: <strong>{selectedChild?.class_name || '-'}</strong></td></tr>
                        <tr><td style={{ padding: '3px 0' }}>Fase</td><td>: {raporData.phase || 'D'}</td></tr>
                        <tr><td style={{ padding: '3px 0' }}>Semester</td><td>: {raporData.semester || '2 (Genap)'}</td></tr>
                        <tr><td style={{ padding: '3px 0' }}>Tahun Pelajaran</td><td>: {progress?.academic_year || '2025/2026'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SECTION 1: LAPORAN HASIL BELAJAR (AKADEMIK) */}
                <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '10px', textTransform: 'uppercase', textAlign: 'center' }}>
                  LAPORAN HASIL BELAJAR
                </h3>

                {/* Mata Pelajaran Wajib Table */}
                <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>MATA PELAJARAN WAJIB</h4>
                <div className="report-table-wrapper">
                  <table style={{ border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000', textAlign: 'center' }}>
                        <th style={{ padding: '8px', borderRight: '1px solid #000', width: '35px' }}>No</th>
                        <th style={{ padding: '8px', borderRight: '1px solid #000', width: '220px', textAlign: 'left' }}>Mata Pelajaran</th>
                        <th style={{ padding: '8px', borderRight: '1px solid #000', width: '110px' }}>Nilai Akhir (NA)</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Capaian Kompetensi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectGrades.filter(sg => !isMulokSubject(sg.subject)).length > 0 ? (
                        subjectGrades.filter(sg => !isMulokSubject(sg.subject)).map((sg, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '700' }}>{sg.subject}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', fontWeight: sg.hasScore ? '800' : 'normal', color: sg.hasScore ? '#000' : '#94a3b8' }}>
                              {sg.hasScore ? Math.round(sg.average) : '-'}
                            </td>
                            <td style={{ padding: '8px', fontSize: '11px', lineHeight: '1.4' }}>
                              {sg.hasScore 
                                ? (raporData.competencies?.[sg.subject] || `Mencapai Kompetensi dengan sangat baik dalam materi ajar ${sg.subject}.`)
                                : <span style={{ color: '#64748b', fontStyle: 'italic' }}>Belum ada nilai yang diunggah oleh guru mata pelajaran.</span>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>Belum ada data nilai pelajaran wajib.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Muatan Lokal Table */}
                <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>MUATAN LOKAL</h4>
                <div className="report-table-wrapper">
                  <table style={{ border: '1px solid #000' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000', textAlign: 'center' }}>
                        <th style={{ padding: '8px', borderRight: '1px solid #000', width: '35px' }}>No</th>
                        <th style={{ padding: '8px', borderRight: '1px solid #000', width: '220px', textAlign: 'left' }}>Mata Pelajaran</th>
                        <th style={{ padding: '8px', borderRight: '1px solid #000', width: '110px' }}>Nilai Akhir (NA)</th>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Capaian Kompetensi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjectGrades.filter(sg => isMulokSubject(sg.subject)).length > 0 ? (
                        subjectGrades.filter(sg => isMulokSubject(sg.subject)).map((sg, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '700' }}>{sg.subject}</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', fontWeight: sg.hasScore ? '800' : 'normal', color: sg.hasScore ? '#000' : '#94a3b8' }}>
                              {sg.hasScore ? Math.round(sg.average) : '-'}
                            </td>
                            <td style={{ padding: '8px', fontSize: '11px', lineHeight: '1.4' }}>
                              {sg.hasScore 
                                ? (raporData.competencies?.[sg.subject] || `Mencapai Kompetensi dengan sangat baik dalam materi ajar ${sg.subject}.`)
                                : <span style={{ color: '#64748b', fontStyle: 'italic' }}>Belum ada nilai yang diunggah oleh guru mata pelajaran.</span>}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr style={{ borderBottom: '1px solid #000' }}>
                          <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>1</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '700' }}>Muatan Lokal Bahasa Daerah</td>
                          <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', color: '#94a3b8' }}>-</td>
                          <td style={{ padding: '8px', fontStyle: 'italic', color: '#64748b', fontSize: '11px' }}>
                            Belum ada nilai yang diunggah oleh guru mata pelajaran.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* KOKURIKULER / P5 SECTION */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>KOKURIKULER (PROJEK P5)</h4>
                  <div style={{ padding: '12px', border: '1px solid #000', fontSize: '11px', lineHeight: '1.5', background: '#fafafa' }}>
                    {raporData.kokurikuler_note || 'Pada semester ini, ananda menunjukkan capaian yang cukup baik dalam pelaksanaan projek kokurikuler Penguatan Profil Pelajar Pancasila.'}
                  </div>
                </div>

                {/* SECTION 2: EKSTRAKURIKULER, KEHADIRAN & CATATAN WALI KELAS */}
                <div style={{ marginTop: '20px' }}>
                  {/* Table Ekstrakurikuler */}
                  <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>EKSTRAKURIKULER</h4>
                  <div className="report-table-wrapper">
                    <table style={{ border: '1px solid #000' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                          <th style={{ padding: '8px', borderRight: '1px solid #000', width: '40px', textAlign: 'center' }}>No</th>
                          <th style={{ padding: '8px', borderRight: '1px solid #000', width: '220px', textAlign: 'left' }}>Kegiatan Ekstrakurikuler</th>
                          <th style={{ padding: '8px', textAlign: 'left' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {raporData.extracurriculars && raporData.extracurriculars.length > 0 ? (
                          raporData.extracurriculars.map((ex, idx) => (
                            <tr key={idx} style={{ borderBottom: idx < raporData.extracurriculars.length - 1 ? '1px solid #000' : 'none' }}>
                              <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '600' }}>{ex.name}</td>
                              <td style={{ padding: '8px' }}>{ex.note || ex.keterangan || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>1</td>
                            <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '600' }}>Pramuka Putra</td>
                            <td style={{ padding: '8px' }}>Memiliki kedisiplinan tinggi, aktif, dan mau bekerja sama dalam berbagai kegiatan lapangan.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Kehadiran & Catatan Wali Kelas */}
                  <div className="identity-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>KETIDAKHADIRAN</h4>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #000' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #000' }}>
                            <th style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'left' }}>Keadaan</th>
                            <th style={{ padding: '8px', textAlign: 'center' }}>Lamanya</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Sakit</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700' }}>{raporData.attendance?.sick || 0} hari</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #000' }}>
                            <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Izin</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700' }}>{raporData.attendance?.permit || 0} hari</td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Tanpa Keterangan</td>
                            <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700' }}>{raporData.attendance?.absent || 0} hari</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', textTransform: 'uppercase' }}>CATATAN WALI KELAS</h4>
                      <div style={{
                        width: '100%',
                        border: '1px dashed #000',
                        padding: '10px',
                        fontSize: '12px',
                        lineHeight: '1.5',
                        fontStyle: 'italic',
                        background: '#fafafa',
                        borderRadius: '4px',
                        boxSizing: 'border-box'
                      }}>
                        {raporData.note || 'Ananda memiliki perkembangan belajar yang baik.'}
                      </div>
                    </div>
                  </div>

                  {/* PARENT FEEDBACK SECTION (TANGGAPAN ORANG TUA) */}
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px', color: '#166534', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>forum</span>
                      TANGGAPAN ORANG TUA / WALI MURID
                    </h4>
                    <div style={{ border: '1px solid #bbf7d0', padding: '12px', background: '#f0fdf4', borderRadius: '8px' }}>
                      {/* For Editing */}
                      <div className="no-print">
                        <textarea
                          rows={3}
                          placeholder="Masukkan tanggapan Anda sebagai orang tua di sini..."
                          value={parentFeedback}
                          onChange={(e) => setParentFeedback(e.target.value)}
                          style={{
                            width: '100%',
                            border: '1px dashed #4ade80',
                            padding: '8px',
                            fontSize: '12px',
                            fontFamily: 'inherit',
                            outline: 'none',
                            boxSizing: 'border-box',
                            marginBottom: '8px',
                            background: '#fff'
                          }}
                        />
                        <button
                          onClick={handleSaveParentFeedback}
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            marginBottom: '8px'
                          }}
                        >
                          Simpan Tanggapan
                        </button>
                      </div>
                      
                      {/* For Print / Read Only View */}
                      <div style={{ padding: '8px', fontStyle: 'italic', fontSize: '12px', color: '#14532d' }}>
                        {raporData.parent_feedback ? `"${raporData.parent_feedback}"` : "Belum ada tanggapan yang disimpan."}
                      </div>
                    </div>
                  </div>

                  {/* SIGNATURE BLOCK */}
                  <div className="signature-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center', fontSize: '12px', marginTop: '36px' }}>
                    <div>
                      <div>Mengetahui,</div>
                      <div>Orang Tua / Wali</div>
                      <div style={{ height: '60px' }}></div>
                      <div style={{ fontWeight: '700', textDecoration: 'underline' }}>( {raporData.parent_feedback ? 'Orang Tua Siswa' : '....................................'} )</div>
                    </div>

                    <div>
                      <div>{raporData.place_date || 'Tegal, 19 Juni 2026'}</div>
                      <div>Wali Kelas</div>
                      <div style={{ height: '50px' }}></div>
                      <div style={{ fontWeight: '700', textDecoration: 'underline' }}>{raporData.teacher_name || 'Wali Kelas'}</div>
                      <div>{raporData.teacher_nip || ''}</div>
                    </div>

                    <div>
                      <div>Mengetahui,</div>
                      <div>Kepala Sekolah</div>
                      <div style={{ height: '50px' }}></div>
                      <div style={{ fontWeight: '700', textDecoration: 'underline' }}>{raporData.headmaster_name || 'Kepala Sekolah'}</div>
                      <div>{raporData.headmaster_nip || ''}</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // UNOFFICIAL / AUTO CALCULATED PREVIEW OR WARNING
              <div>
                <div style={{ textAlign: 'center', marginBottom: '24px', padding: '16px 20px', background: '#fffbeb', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#d97706', marginBottom: '6px' }}>warning</span>
                  <h3 style={{ margin: '0 0 6px 0', color: '#92400e', fontSize: '18px' }}>Rapor Resmi Belum Dibagikan</h3>
                  <p style={{ margin: 0, color: '#b45309', fontSize: '13px', lineHeight: '1.4' }}>
                    Wali Kelas belum mempublikasikan rapor resmi untuk semester ini. Laporan di bawah ini adalah rekapan nilai otomatis dari sistem.
                  </p>
                </div>
                
                <div className="print-header" style={{ marginBottom: '24px', textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '16px' }}>
                  <h1 style={{ fontSize: '22px', margin: '0 0 10px 0', color: '#0f172a', textTransform: 'uppercase', lineHeight: '1.3' }}>Laporan Hasil Belajar Siswa (Draft)</h1>
                  
                  <div className="identity-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '16px', textAlign: 'left', fontSize: '13px', color: '#334155' }}>
                    <div>
                      <p style={{ margin: '4px 0' }}><strong>Nama Siswa:</strong> {selectedChild?.full_name}</p>
                      <p style={{ margin: '4px 0' }}><strong>NIS:</strong> {selectedChild?.nis || '-'}</p>
                    </div>
                    <div>
                      <p style={{ margin: '4px 0' }}><strong>Kelas:</strong> {selectedChild?.class_name || '-'}</p>
                      <p style={{ margin: '4px 0' }}><strong>Tanggal Dicetak:</strong> {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      {lastUpdated && (
                        <p style={{ margin: '4px 0', color: '#0369a1' }}>
                          <strong>Terakhir Diperbarui:</strong> {formatLastUpdated(lastUpdated)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {progress && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>A. Ringkasan Akademik</h3>
                    <div className="summary-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', textAlign: 'center' }}>
                      <div style={{ padding: '14px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Rata-rata Keseluruhan</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2563eb', marginTop: '6px' }}>{progress.avgScore?.toFixed(1) || 0}</div>
                      </div>
                      <div style={{ padding: '14px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Kehadiran</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#16a34a', marginTop: '6px' }}>{progress.attendanceRate?.toFixed(1) || 100}%</div>
                      </div>
                      <div style={{ padding: '14px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Penyelesaian Materi</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#9333ea', marginTop: '6px' }}>{progress.materialCompletionRate?.toFixed(1) || 0}%</div>
                      </div>
                      <div style={{ padding: '14px 10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Status Risiko</div>
                        <div style={{ fontSize: '15px', fontWeight: 'bold', color: progress.risk === 'High' ? '#dc2626' : progress.risk === 'Medium' ? '#d97706' : '#16a34a', marginTop: '10px' }}>
                          {progress.risk === 'Low' ? 'Aman' : progress.risk === 'Medium' ? 'Perlu Perhatian' : 'Kritis'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>B. Nilai Mata Pelajaran</h3>
                  
                  <div className="report-table-wrapper">
                    <table>
                      <thead>
                        <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                          <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '45px' }}>No</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left', minWidth: '160px' }}>Mata Pelajaran</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '100px' }}>Tugas Terkumpul</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '110px' }}>Rata-rata Nilai</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', width: '80px' }}>Predikat</th>
                          <th style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'left' }}>Keterangan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subjectGrades.map((sg, idx) => (
                          <tr key={idx} style={{ background: sg.hasScore ? '#ffffff' : '#fafafa' }}>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', fontWeight: sg.hasScore ? '600' : 'normal' }}>{sg.subject}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center' }}>{sg.taskCount}</td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: sg.hasScore ? '#0f172a' : '#94a3b8' }}>
                              {sg.hasScore ? sg.average.toFixed(1) : '-'}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px', textAlign: 'center', fontWeight: 'bold', color: sg.hasScore ? '#2563eb' : '#94a3b8' }}>
                              {sg.gradeLetter}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '10px' }}>
                              {sg.hasScore ? (
                                sg.description
                              ) : (
                                <span style={{ color: '#64748b', fontStyle: 'italic', fontSize: '13px' }}>
                                  Menunggu upload nilai dari guru
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {progress?.message && (
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '8px', marginBottom: '14px', color: '#0f172a', fontSize: '16px', fontWeight: '700' }}>C. Catatan Sistem</h3>
                    <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#334155', lineHeight: '1.5', fontSize: '14px' }}>
                      {progress.message}
                    </div>
                  </div>
                )}
                
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end', paddingRight: '20px' }}>
                  <div style={{ textAlign: 'center', width: '200px' }}>
                    <p style={{ marginBottom: '70px', fontSize: '14px' }}>Mengetahui,</p>
                    <p style={{ borderTop: '1px solid #000', paddingTop: '8px', fontSize: '14px' }}><strong>Orang Tua / Wali</strong></p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
};

export default OrtuReports;

