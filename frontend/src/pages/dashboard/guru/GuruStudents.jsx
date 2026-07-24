import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-students.css';

const GuruStudents = () => {
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [availableClasses, setAvailableClasses] = useState([]);

  // Detail Rapor Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [homeroomNote, setHomeroomNote] = useState('Fokus dan seriuslah dalam belajar di kelas ya. Semangat dan semoga sukses!');

  useEffect(() => {
    fetchMyStudents();
  }, []);

  const fetchMyStudents = async () => {
    try {
      const response = await api.get('/guru/students');
      const studentsData = response.data.students || [];
      const classSet = new Set(studentsData.map((s) => s.class_name));
      const classList = Array.from(classSet).map((name) => ({ name, value: name }));
      setAvailableClasses(classList);
      setStudents(studentsData);
      if (response.data.subjects) {
        setSubjects(response.data.subjects);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDetailClick = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const handlePrintRapor = () => {
    window.print();
  };

  const getSubjectLabel = (code) => {
    const mapping = {
      PAI: 'PAI',
      PPKn: 'P. Pancasila',
      BIN: 'B. Indo',
      MAT: 'MTK',
      IPA: 'IPA',
      IPS: 'IPS',
      BIG: 'Inggris',
      SBK: 'Seni dan Pra',
      PJOK: 'PJOK',
      INF: 'Informatika',
      BJW: 'B. Jawa',
    };
    return mapping[code] || code;
  };

  const generateCapaianKompetensi = (na, subjectName) => {
    if (na >= 88) {
      return `Sangat baik dalam memahami materi ${subjectName}. Mampu menguasai seluruh indikator Tujuan Pembelajaran (TP) dengan hasil optimal.`;
    } else if (na >= 78) {
      return `Menunjukkan penguasaan yang baik dalam memahami konsep dasar ${subjectName}. Perlu sedikit penguatan pada latihan soal mandiri.`;
    } else if (na >= 75) {
      return `Cukup menguasai materi ${subjectName}. Memerlukan pendampingan lebih lanjut untuk meningkatkan konsistensi belajar.`;
    } else {
      return `Perlu pendampingan dan bimbingan khusus dalam memahami kompetensi dasar ${subjectName}.`;
    }
  };

  const filteredStudents = students.filter((student) => {
    const fullName = student.full_name || '';
    const matchesSearch =
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis?.includes(searchTerm);
    const matchesClass = !selectedClass || student.class_name === selectedClass;
    return matchesSearch && matchesClass;
  });

  if (loading) return <div className="loading">Memuat data siswa binaan...</div>;

  return (
    <div className="guru-dashboard-content">
      {/* Print Styles for Kurikulum Merdeka Report Card */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .rapor-print-container, .rapor-print-container * {
            visibility: visible;
          }
          .rapor-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            background: #fff !important;
            color: #000 !important;
          }
          .modal-overlay, .modal-content {
            background: none !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="page-header-flex no-print">
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>👨‍🎓 Siswa Binaan & Rapor Kelas (Wali Kelas)</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Rekapitulasi Capaian Akademik Siswa Binaan & Cetak Rapor Intrakurikulum Merdeka Resmi.
          </p>
        </div>
        <div className="grade-legend">
          <span className="legend-item"><span className="dot red"></span> Nilai di bawah KKM (&lt;75)</span>
        </div>
      </div>

      <div className="filter-bar spreadsheet-filter-bar no-print" style={{ marginTop: '20px' }}>
        <div className="search-box">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            placeholder="Cari nama atau NIS..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-modern"
          />
        </div>

        <div className="selectors-group">
          <div className="filter-select-wrapper">
            <span className="select-icon material-symbols-outlined">class</span>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="modern-select">
              <option value="">Semua Kelas Binaan</option>
              {availableClasses.map((cls) => (
                <option key={cls.value} value={cls.value}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="student-table-container glass-container no-print">
        <table className="student-table spreadsheet-table">
          <thead>
            <tr>
              <th rowSpan="2" className="text-center">No</th>
              <th rowSpan="2" className="text-left th-name-sticky">Nama Siswa</th>
              <th colSpan={subjects.length} className="text-center th-section-header">Rata-Rata Nilai Tugas Harian Mapel</th>
              <th rowSpan="2" className="text-center th-bold-header">Jumlah</th>
              <th rowSpan="2" className="text-center th-bold-header">Rata2</th>
              <th rowSpan="2" className="text-center th-bold-header">Rank</th>
              <th colSpan="4" className="text-center th-attendance-header">Kehadiran</th>
              <th rowSpan="2" className="text-center th-actions-sticky">Aksi Rapor</th>
            </tr>
            <tr>
              {subjects.map((sub) => (
                <th key={sub._id} className="text-center th-subject-code-sub" title={sub.name}>
                  {getSubjectLabel(sub.code)}
                </th>
              ))}
              <th className="text-center th-att-header" title="Sakit">S</th>
              <th className="text-center th-att-header" title="Izin">I</th>
              <th className="text-center th-att-header" title="Alpha">A</th>
              <th className="text-center th-att-header" title="Jumlah Tidak Hadir">jmlh</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student, idx) => {
                const totalScore = student.task_sum;
                const avgScore = student.task_avg;
                const rank = student.rank_task;

                return (
                  <tr key={student._id} className="spreadsheet-row">
                    <td className="text-center row-number">{idx + 1}</td>
                    <td className="student-name-cell th-name-sticky">{student.full_name}</td>
                    {subjects.map((sub) => {
                      const score = student.tasks?.[sub._id.toString()];
                      const displayScore = score !== undefined && score !== null ? score : '-';
                      const isBelowKKM = typeof score === 'number' && score < 75;

                      return (
                        <td key={sub._id} className={`text-center score-cell ${isBelowKKM ? 'kkm-fail' : ''}`}>
                          {displayScore}
                        </td>
                      );
                    })}
                    <td className="text-center font-semibold total-score-cell">{totalScore !== undefined ? totalScore : '-'}</td>
                    <td className="text-center font-semibold avg-score-cell">{avgScore !== undefined ? avgScore : '-'}</td>
                    <td className="text-center rank-cell">
                      <span className={`rank-pill rank-no-${rank}`}>{rank}</span>
                    </td>
                    <td className="text-center att-cell sick-color">{student.attendance?.sick || 0}</td>
                    <td className="text-center att-cell late-color">{student.attendance?.late || 0}</td>
                    <td className="text-center att-cell absent-color">{student.attendance?.absent || 0}</td>
                    <td className="text-center att-cell font-semibold total-att-color">{student.attendance?.total || 0}</td>
                    <td className="text-center th-actions-sticky">
                      <button
                        className="btn-action-view"
                        onClick={() => handleDetailClick(student)}
                        style={{ background: '#2563eb', color: '#fff', padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                        Cetak Rapor
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6 + subjects.length + 4} className="text-center empty-table-state">
                  <span className="material-symbols-outlined empty-icon">group_off</span>
                  <p>Tidak ada data siswa binaan ditemukan</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL RAPOR INTRAKURIKULER KURIKULUM MERDEKA (PRINTABLE E-RAPOR)           */}
      {/* ========================================================================= */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)} style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div
            className="modal-content rapor-print-container"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '920px', maxWidth: '95%', background: '#fff', borderRadius: '16px', padding: '36px', color: '#0f172a', maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Modal Top Action Controls */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  📜 Pratinjau Rapor Intrakurikulum Merdeka
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>Format Standar e-Rapor Kemendikbudristek</span>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handlePrintRapor}
                  style={{ padding: '8px 18px', borderRadius: '10px', background: '#16a34a', color: '#fff', border: 'none', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>print</span>
                  Cetak / Simpan PDF
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  style={{ padding: '8px 14px', borderRadius: '10px', background: '#f1f5f9', color: '#64748b', border: 'none', fontWeight: '700', cursor: 'pointer' }}
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* RAPOR HEADER / KOP */}
            <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #000', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
                RAPOR INTRAKURIKULER
              </h2>
              <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>SMP NEGERI 1 SURADADI</div>
            </div>

            {/* IDENTITY HEADER GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ width: '120px', padding: '3px 0' }}>Nama Sekolah</td><td>: SMP NEGERI 1 SURADADI</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Alamat</td><td>: Jl. Raya Suradadi No. 12</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Nama Siswa</td><td>: <strong>{selectedStudent.full_name}</strong></td></tr>
                    <tr><td style={{ padding: '3px 0' }}>NIS / NISN</td><td>: {selectedStudent.nis || '-'} / 0081293810</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ width: '120px', padding: '3px 0' }}>Kelas</td><td>: <strong>{selectedStudent.class_name}</strong></td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Fase</td><td>: D</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Semester</td><td>: 1 (Ganjil)</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Tahun Pelajaran</td><td>: 2024/2025</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 1: LAPORAN HASIL BELAJAR (AKADEMIK) */}
            <h3 style={{ fontSize: '15px', fontWeight: '800', marginBottom: '10px', textTransform: 'uppercase', textAlign: 'center' }}>
              LAPORAN HASIL BELAJAR
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '28px', border: '1px solid #000' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000', textAlign: 'center' }}>
                  <th style={{ padding: '10px', borderRight: '1px solid #000', width: '40px' }}>No</th>
                  <th style={{ padding: '10px', borderRight: '1px solid #000', width: '220px', textAlign: 'left' }}>Mata Pelajaran</th>
                  <th style={{ padding: '10px', borderRight: '1px solid #000', width: '90px' }}>Nilai Akhir (NA)</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub, idx) => {
                  const taskScore = selectedStudent.tasks?.[sub._id.toString()];
                  const examGrades = selectedStudent.grades?.[sub._id.toString()] || {};
                  const utsScore = examGrades.uts;
                  const uasScore = examGrades.uas;

                  const NH = typeof taskScore === 'number' ? taskScore : 75;
                  const PTS = typeof utsScore === 'number' ? utsScore : NH;
                  const PAS = typeof uasScore === 'number' ? uasScore : NH;
                  const NA = Math.round((2 * NH + PTS + PAS) / 4);

                  return (
                    <tr key={sub._id} style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '700' }}>{sub.name}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', fontWeight: '800', fontSize: '13px' }}>
                        {NA}
                      </td>
                      <td style={{ padding: '8px', lineHeight: '1.4' }}>
                        {generateCapaianKompetensi(NA, sub.name)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="page-break" style={{ height: '1px' }}></div>

            {/* SECTION 2: EKSTRAKURIKULER, KEHADIRAN & CATATAN WALI KELAS */}
            <div style={{ marginTop: '20px' }}>
              {/* Table Ekstrakurikuler */}
              <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>EKSTRAKURIKULER</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '20px', border: '1px solid #000' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '40px', textAlign: 'center' }}>No</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '200px', textAlign: 'left' }}>Kegiatan Ekstrakurikuler</th>
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '100px', textAlign: 'center' }}>Predikat</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>1</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '600' }}>Pramuka (Wajib)</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', fontWeight: '700' }}>Baik</td>
                    <td style={{ padding: '8px' }}>Telah menguasai teknik dasar kepramukaan dan kedisiplinan.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>2</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '600' }}>PMR / Olahraga</td>
                    <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', fontWeight: '700' }}>Baik</td>
                    <td style={{ padding: '8px' }}>Aktif mengikuti kegiatan latihan mingguan.</td>
                  </tr>
                </tbody>
              </table>

              {/* Table Kehadiran */}
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>KETIDAKHADIRAN</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #000' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid #000', width: '140px' }}>Sakit</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700' }}>{selectedStudent.attendance?.sick || 0} hari</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #000' }}>
                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Izin</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700' }}>{selectedStudent.attendance?.late || 0} hari</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px', borderRight: '1px solid #000' }}>Tanpa Keterangan</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: '700' }}>{selectedStudent.attendance?.absent || 0} hari</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', marginBottom: '8px' }}>CATATAN WALI KELAS</h4>
                  <div style={{ border: '1px solid #000', padding: '12px', fontSize: '12px', minHeight: '80px', lineHeight: '1.5', fontStyle: 'italic', background: '#fafafa' }}>
                    "{homeroomNote}"
                  </div>
                </div>
              </div>

              {/* SIGNATURE BLOCK */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center', fontSize: '12px', marginTop: '40px' }}>
                <div>
                  <div>Mengetahui,</div>
                  <div>Orang Tua / Wali</div>
                  <div style={{ height: '70px' }}></div>
                  <div style={{ fontWeight: '700', textDecoration: 'underline' }}>( .................................... )</div>
                </div>

                <div>
                  <div>Suradadi, 20 Desember 2024</div>
                  <div>Wali Kelas</div>
                  <div style={{ height: '70px' }}></div>
                  <div style={{ fontWeight: '700', textDecoration: 'underline' }}>Muzayin, M.Pd.I</div>
                  <div>NIP. 19800512 200604 1 008</div>
                </div>

                <div>
                  <div>Mengetahui,</div>
                  <div>Kepala Sekolah</div>
                  <div style={{ height: '70px' }}></div>
                  <div style={{ fontWeight: '700', textDecoration: 'underline' }}>Drs. H. Ahmad Sudrajat, M.Pd</div>
                  <div>NIP. 19680315 199403 1 005</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruStudents;