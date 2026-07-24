import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-students.css';

const GuruInputNilai = () => {
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'rekap'

  // Options State
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [examType, setExamType] = useState('uts');

  // Input Tab State
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Rekap Tab State
  const [rekapGrades, setRekapGrades] = useState([]);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [rekapSearch, setRekapSearch] = useState('');

  useEffect(() => {
    fetchClassesAndSubjects();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      if (activeTab === 'input') {
        fetchClassGrades();
      } else {
        fetchRekapGrades();
      }
    }
  }, [selectedClass, selectedSubject, examType, activeTab]);

  const fetchClassesAndSubjects = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
      ]);

      const classList = classesRes.data.data || [];
      const subjectList = subjectsRes.data.data || [];

      setClasses(classList);
      setSubjects(subjectList);

      if (classList.length > 0) setSelectedClass(classList[0]._id);
      if (subjectList.length > 0) setSelectedSubject(subjectList[0]._id);
    } catch (err) {
      console.error('Error fetching master classes/subjects:', err);
      setMessage({ type: 'error', text: 'Gagal memuat daftar kelas dan mata pelajaran.' });
    }
  };

  const fetchClassGrades = async () => {
    if (!selectedClass || !selectedSubject) return;
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });

      const res = await api.get('/guru/grades/class', {
        params: {
          classId: selectedClass,
          subjectId: selectedSubject,
          type: examType,
        },
      });

      const data = res.data.data || [];
      const mapped = data.map((item) => ({
        student_id: item._id,
        full_name: item.full_name,
        nis: item.nis,
        score: item.grade?.score !== undefined && item.grade?.score !== null ? item.grade.score : '',
        note: item.grade?.note || '',
      }));

      setStudents(mapped);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal memuat nilai siswa kelas ini.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRekapGrades = async () => {
    if (!selectedClass || !selectedSubject) return;
    try {
      setLoadingRekap(true);
      const res = await api.get('/guru/grades/class', {
        params: {
          classId: selectedClass,
          subjectId: selectedSubject,
          type: examType,
        },
      });
      setRekapGrades(res.data.data || []);
    } catch (err) {
      console.error('Error fetching rekap grades:', err);
    } finally {
      setLoadingRekap(false);
    }
  };

  const handleScoreChange = (index, value) => {
    const updated = [...students];
    updated[index].score = value;
    setStudents(updated);
  };

  const handleNoteChange = (index, value) => {
    const updated = [...students];
    updated[index].note = value;
    setStudents(updated);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (!selectedClass || !selectedSubject) return;

    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const gradesPayload = students.map((s) => ({
        student_id: s.student_id,
        score: s.score !== '' ? Number(s.score) : null,
        note: s.note,
      }));

      await api.post('/guru/grades/class/save', {
        classId: selectedClass,
        subjectId: selectedSubject,
        type: examType,
        grades: gradesPayload,
      });

      setMessage({ type: 'success', text: 'Semua nilai berhasil disimpan!' });
      fetchClassGrades();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan nilai' });
    } finally {
      setSaving(false);
    }
  };

  const filteredRekap = rekapGrades.filter((item) => {
    const name = item.full_name || '';
    const nis = item.nis || '';
    return name.toLowerCase().includes(rekapSearch.toLowerCase()) || nis.includes(rekapSearch);
  });

  return (
    <div className="guru-dashboard-content" style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '800', color: '#0f172a' }}>
          📝 Modul Penilaian Ujian (UTS / UAS) Guru Mapel
        </h2>
        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
          Pilih kelas dan mata pelajaran yang Anda ampu untuk menginput atau melihat rekap nilai ujian siswa.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('input')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'input' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'input' ? '#2563eb' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit_square</span>
          Form Input Nilai Ujian
        </button>

        <button
          onClick={() => setActiveTab('rekap')}
          style={{
            padding: '12px 20px',
            fontWeight: '700',
            fontSize: '14px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderBottom: activeTab === 'rekap' ? '3px solid #2563eb' : '3px solid transparent',
            color: activeTab === 'rekap' ? '#2563eb' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>analytics</span>
          Rekap Hasil Inputan Nilai Saya
        </button>
      </div>

      {/* Selector Controls */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          {/* Class Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>PILIH KELAS</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', fontWeight: '700', minWidth: '160px', outline: 'none' }}
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subject Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>MATA PELAJARAN</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', fontWeight: '700', minWidth: '220px', outline: 'none' }}
            >
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Exam Type Select */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>JENIS UJIAN</label>
            <select
              value={examType}
              onChange={(e) => setExamType(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', fontWeight: '700', minWidth: '200px', outline: 'none' }}
            >
              <option value="uts">UTS / Asesmen Tengah Semester (ATS)</option>
              <option value="uas">UAS / Asesmen Akhir Semester (AAS)</option>
            </select>
          </div>
        </div>

        {activeTab === 'input' && (
          <button
            onClick={handleSaveAll}
            disabled={saving || students.length === 0}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>save</span>
            {saving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
          </button>
        )}
      </div>

      {message.text && (
        <div style={{ padding: '14px 20px', borderRadius: '12px', marginBottom: '24px', background: message.type === 'error' ? '#fef2f2' : '#f0fdf4', border: `1px solid ${message.type === 'error' ? '#fecdd3' : '#bbf7d0'}`, color: message.type === 'error' ? '#991b1b' : '#166534', fontWeight: '600', fontSize: '14px' }}>
          {message.text}
        </div>
      )}

      {/* TAB 1: FORM INPUT NILAI */}
      {activeTab === 'input' && (
        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat daftar siswa...</div>
          ) : students.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tidak ada siswa di kelas ini.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                  <th style={{ padding: '16px 20px', width: '60px', textAlign: 'center' }}>No</th>
                  <th style={{ padding: '16px 20px' }}>Nama Siswa</th>
                  <th style={{ padding: '16px 20px', width: '160px' }}>NIS</th>
                  <th style={{ padding: '16px 20px', width: '180px', textAlign: 'center' }}>Nilai (0-100)</th>
                  <th style={{ padding: '16px 20px' }}>Catatan / Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => (
                  <tr key={student.student_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>{idx + 1}</td>
                    <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f172a' }}>{student.full_name}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b' }}>{student.nis}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={student.score}
                        onChange={(e) => handleScoreChange(idx, e.target.value)}
                        placeholder="Belum ada"
                        style={{ width: '110px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', textAlign: 'center', fontWeight: '700', fontSize: '14px', outline: 'none' }}
                      />
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <input
                        type="text"
                        value={student.note}
                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                        placeholder="Contoh: Sangat baik"
                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: REKAP HASIL INPUTAN NILAI GURU MAPEL */}
      {activeTab === 'rekap' && (
        <div>
          <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#94a3b8', marginRight: '8px' }}>search</span>
            <input
              type="text"
              placeholder="Cari nama atau NIS siswa..."
              value={rekapSearch}
              onChange={(e) => setRekapSearch(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
            />
          </div>

          <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
            {loadingRekap ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat rekap nilai...</div>
            ) : filteredRekap.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Belum ada hasil inputan nilai untuk kelas ini.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px', width: '60px', textAlign: 'center' }}>No</th>
                    <th style={{ padding: '16px 20px' }}>Nama Siswa</th>
                    <th style={{ padding: '16px 20px' }}>NIS</th>
                    <th style={{ padding: '16px 20px', textAlign: 'center' }}>Nilai Inputan ({examType.toUpperCase()})</th>
                    <th style={{ padding: '16px 20px' }}>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRekap.map((item, idx) => (
                    <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: '600', color: '#64748b' }}>{idx + 1}</td>
                      <td style={{ padding: '14px 20px', fontWeight: '700', color: '#0f172a' }}>{item.full_name}</td>
                      <td style={{ padding: '14px 20px', color: '#64748b' }}>{item.nis}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <span style={{ padding: '6px 14px', borderRadius: '20px', fontWeight: '800', fontSize: '14px', background: item.grade?.score !== undefined && item.grade?.score !== null ? '#e0f2fe' : '#f1f5f9', color: item.grade?.score !== undefined && item.grade?.score !== null ? '#0284c7' : '#94a3b8' }}>
                          {item.grade?.score !== undefined && item.grade?.score !== null ? item.grade.score : 'Belum Diinput'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569' }}>{item.grade?.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GuruInputNilai;
