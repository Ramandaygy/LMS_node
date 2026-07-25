import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-students.css';

const GuruStudents = () => {
  const [activeTab, setActiveTab] = useState('rapor'); // 'rapor' (Leger NA Wali Kelas) | 'tugas' (Rekap Mapel Guru Mapel)

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('');

  // Detail Rapor Modal State
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Editable Rapor Fields State
  const [customCompetencies, setCustomCompetencies] = useState({});
  const [customPredikats, setCustomPredikats] = useState({});
  const [homeroomNote, setHomeroomNote] = useState('Fokus dan seriuslah dalam belajar di kelas ya. Hindari melakukan hal yang tidak bermanfaat dan mengganggu kegiatan belajarmu. Semangat dan semoga sukses!');
  const [placeDate, setPlaceDate] = useState('Suradadi, 20 Desember 2024');
  const [teacherName, setTeacherName] = useState('Muzayin, M.Pd.I');
  const [teacherNip, setTeacherNip] = useState('NIP. 19800512 200604 1 008');
  const [headmasterName, setHeadmasterName] = useState('Drs. H. Ahmad Sudrajat, M.Pd');
  const [headmasterNip, setHeadmasterNip] = useState('NIP. 19680315 199403 1 005');

  // Editable Ekstrakurikuler
  const [ekstraList, setEkstraList] = useState([
    { id: 1, name: 'Pramuka (Wajib)', predikat: 'Baik', note: 'Telah menguasai berbagai teknik dasar kepramukaan dan kedisiplinan.' },
    { id: 2, name: 'PMR / Olahraga', predikat: 'Baik', note: 'Aktif dan disiplin mengikuti kegiatan latihan mingguan.' }
  ]);

  // Dynamic & Editable Rapor Kop / Identity States (Connected to Admin Academic Year Data)
  const [raporSchoolName, setRaporSchoolName] = useState('SMP NEGERI 1 SURADADI');
  const [raporSchoolAddress, setRaporSchoolAddress] = useState('Jl. Raya Purwahamba No. 76, Suradadi, Kab. Tegal 52182');
  const [raporPhase, setRaporPhase] = useState('D');
  const [raporSemester, setRaporSemester] = useState('2 (Genap)');
  const [raporAcademicYear, setRaporAcademicYear] = useState('2025/2026');
  const [raporNisn, setRaporNisn] = useState('0081293810');
  const [showKopEditForm, setShowKopEditForm] = useState(false);

  useEffect(() => {
    fetchMyStudents();
  }, []);

  useEffect(() => {
    const activeSubjectList = teacherSubjects.length > 0 ? teacherSubjects : subjects;
    if (activeSubjectList.length > 0 && !selectedSubjectFilter) {
      setSelectedSubjectFilter(activeSubjectList[0]._id);
    }
  }, [teacherSubjects, subjects, selectedSubjectFilter]);

  const fetchMyStudents = async () => {
    try {
      const [response, ayRes] = await Promise.all([
        api.get('/guru/students'),
        api.get('/academic-years').catch(() => ({ data: [] }))
      ]);

      const studentsData = response.data.students || [];
      const hrClass = response.data.homeroom_class || null;
      const allSub = response.data.subjects || [];
      const tSub = response.data.teacher_subjects || allSub;
      const tCls = response.data.teacher_classes || [];

      setStudents(studentsData);
      setHomeroomClass(hrClass);
      setSubjects(allSub);
      setTeacherSubjects(tSub);
      setTeacherClasses(tCls);

      // Auto-connect with Admin Active Academic Year
      const ayList = ayRes.data || [];
      const activeAy = ayList.find(a => a.is_active);
      if (activeAy) {
        setRaporAcademicYear(activeAy.name || '2025/2026');
        setRaporSemester(activeAy.semester ? `${activeAy.semester}` : '2 (Genap)');
      }

      if (tSub.length > 0) {
        setSelectedSubjectFilter(tSub[0]._id);
      }
      if (tCls.length > 0) {
        setSelectedClass(tCls[0].name);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePredikat = (na) => {
    if (typeof na !== 'number') return '-';
    if (na >= 95) return 'A+';
    if (na >= 90) return 'A';
    if (na >= 85) return 'A-';
    if (na >= 82) return 'B+';
    if (na >= 78) return 'B';
    if (na >= 75) return 'B-';
    if (na >= 70) return 'C+';
    if (na >= 65) return 'C';
    if (na >= 60) return 'C-';
    if (na >= 55) return 'D+';
    if (na >= 50) return 'D';
    return 'D-';
  };

  const generateCapaianKompetensi = (na, subjectName) => {
    if (typeof na === 'number') {
      if (na >= 88) {
        return `Sangat baik dalam memahami materi ${subjectName}. Mampu menguasai seluruh indikator Tujuan Pembelajaran (TP) dengan hasil optimal.`;
      } else if (na >= 78) {
        return `Menunjukkan penguasaan yang baik dalam memahami konsep dasar ${subjectName}. Perlu sedikit penguatan pada latihan soal mandiri.`;
      } else if (na >= 75) {
        return `Cukup menguasai materi ${subjectName}. Memerlukan pendampingan lebih lanjut untuk meningkatkan konsistensi belajar.`;
      } else {
        return `Perlu pendampingan dan bimbingan khusus dalam memahami kompetensi dasar ${subjectName}.`;
      }
    }
    return `Belum ada nilai akhir yang diinputkan untuk mata pelajaran ${subjectName}.`;
  };

  const handleDetailClick = (student) => {
    setSelectedStudent(student);

    // Initialize custom competencies & predikats for each subject based on auto-calculation
    const initialComp = {};
    const initialPred = {};
    subjects.forEach((sub) => {
      const na = student.na_grades?.[sub._id.toString()];
      initialComp[sub._id] = generateCapaianKompetensi(na, sub.name);
      initialPred[sub._id] = calculatePredikat(na);
    });

    setCustomCompetencies(initialComp);
    setCustomPredikats(initialPred);
    setShowDetailModal(true);
  };

  const handleCompetencyChange = (subId, value) => {
    setCustomCompetencies((prev) => ({
      ...prev,
      [subId]: value,
    }));
  };

  const handlePredikatChange = (subId, value) => {
    setCustomPredikats((prev) => ({
      ...prev,
      [subId]: value,
    }));
  };

  const handleEkstraChange = (idx, field, value) => {
    const updated = [...ekstraList];
    updated[idx][field] = value;
    setEkstraList(updated);
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

  // Filter students dynamically based on Active Tab
  const filteredStudents = students.filter((student) => {
    const fullName = student.full_name || '';
    const matchesSearch =
      fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.nis?.includes(searchTerm);

    if (activeTab === 'rapor') {
      // Tab 1: Strictly show Homeroom Class students (Wali Kelas)
      const targetHrClass = homeroomClass || (teacherClasses.length > 0 ? teacherClasses[0].name : '');
      const matchesHr = !targetHrClass || student.class_name === targetHrClass;
      return matchesSearch && matchesHr;
    } else {
      // Tab 2: Show students of selected Taught Class (Guru Mapel)
      const matchesClass = !selectedClass || student.class_name === selectedClass;
      return matchesSearch && matchesClass;
    }
  });

  const activeSubjectsForFilter = teacherSubjects.length > 0 ? teacherSubjects : subjects;
  const selectedSubjectDoc = activeSubjectsForFilter.find((s) => s._id.toString() === selectedSubjectFilter) || activeSubjectsForFilter[0];

  if (loading) return <div className="loading">Memuat data siswa...</div>;

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
          textarea, input {
            border: none !important;
            background: transparent !important;
            resize: none !important;
            outline: none !important;
            box-shadow: none !important;
            padding: 0 !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="page-header-flex no-print">
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>👨‍🎓 Siswa Binaan & Rekap Penilaian Kelas</h2>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Rekapitulasi Nilai Akhir Rapor Wali Kelas (Leger NA) & Rekapitulasi Rincian Nilai Guru Mapel (NH, PTS, PAS, Presensi).
          </p>
        </div>
        <div className="grade-legend">
          <span className="legend-item"><span className="dot red"></span> Nilai di bawah KKM (&lt;75)</span>
        </div>
      </div>

      {/* Tabs View Selector */}
      <div className="no-print" style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', margin: '20px 0 24px 0', flexWrap: 'wrap' }}>
        <button
          onClick={() => setActiveTab('rapor')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'rapor' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'rapor' ? '#2563eb' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>assignment_turned_in</span>
          Matriks Leger Nilai Akhir Rapor (NA 2:1:1 - Wali Kelas)
        </button>

        <button
          onClick={() => setActiveTab('tugas')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'tugas' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'tugas' ? '#2563eb' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>menu_book</span>
          Rekap Rincian Nilai Mapel Saya (NH, PTS, PAS, Presensi)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar spreadsheet-filter-bar no-print" style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: '1 1 250px' }}>
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
          {/* Class Filter for Tab 2 (Guru Mapel Classes) */}
          {activeTab === 'tugas' && (
            <div className="filter-select-wrapper">
              <span className="select-icon material-symbols-outlined">class</span>
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="modern-select">
                {teacherClasses.map((cls) => (
                  <option key={cls.id || cls.name} value={cls.name}>
                    Kelas {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject Filter for Tab 2 (Only Teacher Assigned Subjects) */}
          {activeTab === 'tugas' && activeSubjectsForFilter.length > 0 && (
            <div className="filter-select-wrapper">
              <span className="select-icon material-symbols-outlined">subject</span>
              <select value={selectedSubjectFilter} onChange={(e) => setSelectedSubjectFilter(e.target.value)} className="modern-select" style={{ minWidth: '240px' }}>
                {activeSubjectsForFilter.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* MAIN TABLE: TAB 1 (MATRIKS NA RAPOR LEGER WALI KELAS) */}
      {activeTab === 'rapor' && (
        <div className="student-table-container glass-container no-print">
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', padding: '14px 20px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ color: '#2563eb', fontSize: '24px' }}>stars</span>
              <span style={{ fontSize: '14px', color: '#1e3a8a', fontWeight: '700' }}>
                Kelas Binaan Rapor (Wali Kelas): <strong style={{ fontSize: '16px', color: '#0f172a' }}>{homeroomClass || (teacherClasses[0]?.name ? `Kelas ${teacherClasses[0].name}` : 'Semua Kelas')}</strong>
              </span>
            </div>
            <span style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '600' }}>
              Menampilkan {filteredStudents.length} Siswa Binaan Rapor
            </span>
          </div>

          <table className="student-table spreadsheet-table">
            <thead>
              <tr>
                <th rowSpan="2" className="text-center">No</th>
                <th rowSpan="2" className="text-left th-name-sticky">Nama Siswa</th>
                <th colSpan={subjects.length} className="text-center th-section-header" style={{ background: '#0284c7', color: '#fff' }}>
                  Matriks Nilai Akhir (NA) Rapor per Mapel (Formula 2:1:1)
                </th>
                <th rowSpan="2" className="text-center th-bold-header">Jml NA</th>
                <th rowSpan="2" className="text-center th-bold-header">Rata Rapor</th>
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
                  const naSum = student.rapor_sum;
                  const naAvg = student.rapor_avg;
                  const rank = student.rank_rapor;

                  return (
                    <tr key={student._id} className="spreadsheet-row">
                      <td className="text-center row-number">{idx + 1}</td>
                      <td className="student-name-cell th-name-sticky">{student.full_name}</td>
                      {subjects.map((sub) => {
                        const na = student.na_grades?.[sub._id.toString()];
                        const displayNA = na !== undefined && na !== null ? na : '-';
                        const isBelowKKM = typeof na === 'number' && na < 75;

                        return (
                          <td key={sub._id} className={`text-center score-cell ${isBelowKKM ? 'kkm-fail' : ''}`} style={{ fontWeight: '800' }}>
                            {displayNA}
                          </td>
                        );
                      })}
                      <td className="text-center font-semibold total-score-cell">{naSum !== undefined ? naSum : '-'}</td>
                      <td className="text-center font-semibold avg-score-cell" style={{ color: '#0284c7', fontSize: '15px' }}>{naAvg !== undefined ? naAvg : '-'}</td>
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
                          Edit & Cetak Rapor
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6 + subjects.length + 4} className="text-center empty-table-state">
                    <span className="material-symbols-outlined empty-icon">group_off</span>
                    <p>Tidak ada data siswa binaan ditemukan untuk kelas ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MAIN TABLE: TAB 2 (REKAP RINCIAN MAPEL GURU MAPEL: NH, PTS, PAS, NA & PRESENSI) */}
      {activeTab === 'tugas' && (
        <div className="student-table-container glass-container no-print">
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '14px 20px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ color: '#16a34a', fontSize: '24px' }}>menu_book</span>
              <div style={{ fontSize: '14px', color: '#14532d', fontWeight: '600' }}>
                Rincian Penilaian Kelas: <strong style={{ color: '#0f172a', fontSize: '15px' }}>Kelas {selectedClass || teacherClasses[0]?.name || '-'}</strong> | Mata Pelajaran: <strong style={{ color: '#0f172a', fontSize: '15px' }}>{selectedSubjectDoc?.name || 'Mata Pelajaran'}</strong>
              </div>
            </div>
            <span style={{ fontSize: '13px', color: '#16a34a', fontWeight: '700' }}>
              {filteredStudents.length} Siswa
            </span>
          </div>

          <table className="student-table spreadsheet-table">
            <thead>
              <tr style={{ background: '#0f172a', color: '#fff', textAlign: 'center', fontSize: '13px' }}>
                <th style={{ width: '50px', padding: '12px' }}>No</th>
                <th style={{ textAlign: 'left', padding: '12px' }}>Nama Siswa</th>
                <th style={{ width: '130px', padding: '12px' }}>NIS</th>
                <th style={{ width: '110px', color: '#38bdf8', padding: '12px' }}>NH (Tugas)</th>
                <th style={{ width: '110px', color: '#fbbf24', padding: '12px' }}>PTS (UTS)</th>
                <th style={{ width: '110px', color: '#a78bfa', padding: '12px' }}>PAS (UAS)</th>
                <th style={{ width: '110px', color: '#4ade80', padding: '12px', fontWeight: '800', background: '#1e293b' }}>NA (2:1:1)</th>
                <th style={{ width: '70px', padding: '12px' }}>Sakit</th>
                <th style={{ width: '70px', padding: '12px' }}>Izin</th>
                <th style={{ width: '70px', padding: '12px' }}>Alfa</th>
                <th style={{ width: '110px', padding: '12px', fontWeight: '700' }}>Total Presensi</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, idx) => {
                  const subId = selectedSubjectDoc?._id?.toString();
                  const nh = student.tasks?.[subId];
                  const pts = student.grades?.[subId]?.uts;
                  const pas = student.grades?.[subId]?.uas;
                  const na = student.na_grades?.[subId];

                  return (
                    <tr key={student._id} className="spreadsheet-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td className="text-center">{idx + 1}</td>
                      <td className="font-semibold">{student.full_name}</td>
                      <td className="text-center" style={{ color: '#64748b' }}>{student.nis}</td>
                      <td className="text-center font-bold" style={{ color: typeof nh === 'number' && nh < 75 ? '#dc2626' : '#0f172a' }}>
                        {nh !== undefined && nh !== null ? nh : '-'}
                      </td>
                      <td className="text-center font-bold" style={{ color: typeof pts === 'number' && pts < 75 ? '#dc2626' : '#0f172a' }}>
                        {pts !== undefined && pts !== null ? pts : '-'}
                      </td>
                      <td className="text-center font-bold" style={{ color: typeof pas === 'number' && pas < 75 ? '#dc2626' : '#0f172a' }}>
                        {pas !== undefined && pas !== null ? pas : '-'}
                      </td>
                      <td className="text-center font-bold" style={{ color: typeof na === 'number' && na < 75 ? '#dc2626' : '#0284c7', background: '#f8fafc', fontSize: '15px' }}>
                        {na !== undefined && na !== null ? na : '-'}
                      </td>
                      <td className="text-center att-cell sick-color">{student.attendance?.sick || 0}</td>
                      <td className="text-center att-cell late-color">{student.attendance?.late || 0}</td>
                      <td className="text-center att-cell absent-color">{student.attendance?.absent || 0}</td>
                      <td className="text-center att-cell font-bold total-att-color">{student.attendance?.total || 0} hari</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="11" className="text-center empty-table-state">
                    <span className="material-symbols-outlined empty-icon">group_off</span>
                    <p>Tidak ada data siswa ditemukan untuk kelas ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL RAPOR INTRAKURIKULER KURIKULUM MERDEKA (EDITABLE & PRINTABLE)        */}
      {/* ========================================================================= */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)} style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}>
          <div
            className="modal-content rapor-print-container"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '940px', maxWidth: '95%', background: '#fff', borderRadius: '16px', padding: '36px', color: '#0f172a', maxHeight: '92vh', overflowY: 'auto' }}
          >
            {/* Modal Top Action Controls */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  📜 Edit & Pratinjau Rapor Kurikulum Merdeka
                </h3>
                <span style={{ fontSize: '13px', color: '#64748b' }}>
                  Format Resmi Rapor Kurikulum Merdeka (Formula: NA = (Tugas Harian + PTS + PAS) / 3)
                </span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowKopEditForm(!showKopEditForm)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    background: showKopEditForm ? '#cbd5e1' : '#eff6ff',
                    color: showKopEditForm ? '#0f172a' : '#2563eb',
                    border: '1px solid #bfdbfe',
                    fontWeight: '700',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                  {showKopEditForm ? 'Tutup Edit Kop' : '✏️ Edit Kop & Identitas'}
                </button>
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

            {/* EXPANDABLE EDIT KOP & IDENTITAS FORM (NO PRINT) */}
            {showKopEditForm && (
              <div className="no-print" style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px', border: '1px solid #94a3b8' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#2563eb' }}>tune</span>
                  Edit Kop Surat & Identitas Rapor (Otomatis Terhubung Data Admin)
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', fontSize: '12px' }}>
                  <div>
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '4px', color: '#475569' }}>Nama Sekolah</label>
                    <input type="text" value={raporSchoolName} onChange={e => setRaporSchoolName(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '4px', color: '#475569' }}>Alamat Sekolah</label>
                    <input type="text" value={raporSchoolAddress} onChange={e => setRaporSchoolAddress(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '4px', color: '#475569' }}>Tahun Pelajaran (Admin)</label>
                    <input type="text" value={raporAcademicYear} onChange={e => setRaporAcademicYear(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', color: '#2563eb' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '4px', color: '#475569' }}>Semester (Admin)</label>
                    <input type="text" value={raporSemester} onChange={e => setRaporSemester(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '700', color: '#2563eb' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '4px', color: '#475569' }}>Fase</label>
                    <input type="text" value={raporPhase} onChange={e => setRaporPhase(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                  <div>
                    <label style={{ fontWeight: '700', display: 'block', marginBottom: '4px', color: '#475569' }}>NISN Siswa</label>
                    <input type="text" value={raporNisn} onChange={e => setRaporNisn(e.target.value)} style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }} />
                  </div>
                </div>
              </div>
            )}

            {/* RAPOR HEADER / KOP */}
            <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '3px double #000', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', letterSpacing: '1px', textTransform: 'uppercase' }}>
                RAPOR INTRAKURIKULER
              </h2>
              <div style={{ fontSize: '14px', fontWeight: '700', marginTop: '4px' }}>{raporSchoolName}</div>
            </div>

            {/* IDENTITY HEADER GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '13px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ width: '120px', padding: '3px 0' }}>Nama Sekolah</td><td>: {raporSchoolName}</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Alamat</td><td>: {raporSchoolAddress}</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Nama Siswa</td><td>: <strong>{selectedStudent.full_name}</strong></td></tr>
                    <tr><td style={{ padding: '3px 0' }}>NIS / NISN</td><td>: {selectedStudent.nis || '-'} / {raporNisn}</td></tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr><td style={{ width: '120px', padding: '3px 0' }}>Kelas</td><td>: <strong>{selectedStudent.class_name}</strong></td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Fase</td><td>: {raporPhase}</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Semester</td><td>: {raporSemester}</td></tr>
                    <tr><td style={{ padding: '3px 0' }}>Tahun Pelajaran</td><td>: {raporAcademicYear}</td></tr>
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
                  <th style={{ padding: '10px', borderRight: '1px solid #000', width: '35px' }}>No</th>
                  <th style={{ padding: '10px', borderRight: '1px solid #000', width: '180px', textAlign: 'left' }}>Mata Pelajaran</th>
                  <th style={{ padding: '10px', borderRight: '1px solid #000', width: '85px' }}>Nilai Akhir (NA)</th>
                  <th style={{ padding: '10px', borderRight: '1px solid #000', width: '75px', textAlign: 'center' }}>Predikat / Range</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Capaian Kompetensi</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((sub, idx) => {
                  const na = selectedStudent.na_grades?.[sub._id.toString()];
                  const displayNA = na !== undefined && na !== null ? na : '-';
                  const pred = customPredikats[sub._id] || calculatePredikat(na);

                  return (
                    <tr key={sub._id} style={{ borderBottom: '1px solid #000' }}>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '700' }}>{sub.name}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center', fontWeight: '800', fontSize: '13px' }}>
                        {displayNA}
                      </td>
                      <td style={{ padding: '4px 6px', borderRight: '1px solid #000', textAlign: 'center' }}>
                        <input
                          type="text"
                          value={pred}
                          onChange={(e) => handlePredikatChange(sub._id, e.target.value)}
                          style={{
                            width: '100%',
                            textAlign: 'center',
                            fontWeight: '900',
                            fontSize: '13px',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '4px',
                            padding: '3px 0',
                            color: pred.startsWith('A') ? '#047857' : pred.startsWith('B') ? '#1d4ed8' : pred.startsWith('C') ? '#a16207' : pred.startsWith('D') ? '#b91c1c' : '#0f172a',
                            background: pred.startsWith('A') ? '#ecfdf5' : pred.startsWith('B') ? '#eff6ff' : pred.startsWith('C') ? '#fefce8' : pred.startsWith('D') ? '#fef2f2' : '#ffffff'
                          }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <textarea
                          rows={2}
                          value={customCompetencies[sub._id] || ''}
                          onChange={(e) => handleCompetencyChange(sub._id, e.target.value)}
                          style={{
                            width: '100%',
                            fontSize: '12px',
                            lineHeight: '1.4',
                            border: '1px dashed #cbd5e1',
                            borderRadius: '4px',
                            padding: '4px 6px',
                            fontFamily: 'inherit',
                            outline: 'none',
                          }}
                        />
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
                    <th style={{ padding: '8px', borderRight: '1px solid #000', width: '110px', textAlign: 'center' }}>Predikat</th>
                    <th style={{ padding: '8px', textAlign: 'left' }}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {ekstraList.map((ek, idx) => (
                    <tr key={ek.id} style={{ borderBottom: idx < ekstraList.length - 1 ? '1px solid #000' : 'none' }}>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', fontWeight: '600' }}>
                        <input
                          type="text"
                          value={ek.name}
                          onChange={(e) => handleEkstraChange(idx, 'name', e.target.value)}
                          style={{ width: '100%', border: '1px dashed #cbd5e1', padding: '2px 4px', fontSize: '12px' }}
                        />
                      </td>
                      <td style={{ padding: '8px', borderRight: '1px solid #000', textAlign: 'center' }}>
                        <input
                          type="text"
                          value={ek.predikat}
                          onChange={(e) => handleEkstraChange(idx, 'predikat', e.target.value)}
                          style={{ width: '100%', border: '1px dashed #cbd5e1', padding: '2px 4px', textAlign: 'center', fontSize: '12px', fontWeight: '700' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>
                        <input
                          type="text"
                          value={ek.note}
                          onChange={(e) => handleEkstraChange(idx, 'note', e.target.value)}
                          style={{ width: '100%', border: '1px dashed #cbd5e1', padding: '2px 4px', fontSize: '12px' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Table Kehadiran & Catatan Wali Kelas */}
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
                  <textarea
                    rows={3}
                    value={homeroomNote}
                    onChange={(e) => setHomeroomNote(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1px dashed #000',
                      padding: '10px',
                      fontSize: '12px',
                      lineHeight: '1.5',
                      fontStyle: 'italic',
                      background: '#fafafa',
                      borderRadius: '4px',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* SIGNATURE BLOCK */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', textAlign: 'center', fontSize: '12px', marginTop: '36px' }}>
                <div>
                  <div>Mengetahui,</div>
                  <div>Orang Tua / Wali</div>
                  <div style={{ height: '60px' }}></div>
                  <div style={{ fontWeight: '700', textDecoration: 'underline' }}>( .................................... )</div>
                </div>

                <div>
                  <input
                    type="text"
                    value={placeDate}
                    onChange={(e) => setPlaceDate(e.target.value)}
                    style={{ border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '12px', marginBottom: '2px', width: '100%' }}
                  />
                  <div>Wali Kelas</div>
                  <div style={{ height: '50px' }}></div>
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    style={{ border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '12px', fontWeight: '700', width: '100%', textDecoration: 'underline' }}
                  />
                  <input
                    type="text"
                    value={teacherNip}
                    onChange={(e) => setTeacherNip(e.target.value)}
                    style={{ border: 'none', textAlign: 'center', fontSize: '11px', color: '#475569', width: '100%' }}
                  />
                </div>

                <div>
                  <div>Mengetahui,</div>
                  <div>Kepala Sekolah</div>
                  <div style={{ height: '50px' }}></div>
                  <input
                    type="text"
                    value={headmasterName}
                    onChange={(e) => setHeadmasterName(e.target.value)}
                    style={{ border: '1px dashed #cbd5e1', textAlign: 'center', fontSize: '12px', fontWeight: '700', width: '100%', textDecoration: 'underline' }}
                  />
                  <input
                    type="text"
                    value={headmasterNip}
                    onChange={(e) => setHeadmasterNip(e.target.value)}
                    style={{ border: 'none', textAlign: 'center', fontSize: '11px', color: '#475569', width: '100%' }}
                  />
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