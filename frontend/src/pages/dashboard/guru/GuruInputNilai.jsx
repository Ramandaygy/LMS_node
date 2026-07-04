import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/guru/guru-students.css'; // reuse styles

const GuruInputNilai = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [selectedScheduleInfo, setSelectedScheduleInfo] = useState(null);
  const [examType, setExamType] = useState('uts');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const res = await api.get('/attendance/schedules');
      const list = res.data.schedules || [];
      setSchedules(list);
      if (list.length > 0) {
        setSelectedSchedule(list[0].id);
        setSelectedScheduleInfo(list[0]);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat jadwal mengajar' });
    }
  };

  useEffect(() => {
    if (selectedScheduleInfo) {
      fetchClassGrades();
    }
  }, [selectedSchedule, examType]);

  const fetchClassGrades = async () => {
    if (!selectedScheduleInfo) return;
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const res = await api.get('/guru/grades/class', {
        params: {
          classId: selectedScheduleInfo.class_id,
          subjectId: selectedScheduleInfo.subject_id,
          type: examType
        }
      });
      
      const data = res.data.data || [];
      // Map grades to flat object structure for state manipulation
      const mapped = data.map(item => ({
        student_id: item._id,
        full_name: item.full_name,
        nis: item.nis,
        score: item.grade?.score !== undefined ? item.grade.score : '',
        note: item.grade?.note || ''
      }));
      setStudents(mapped);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat nilai siswa kelas ini' });
    } finally {
      setLoading(false);
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
    if (!selectedScheduleInfo) return;
    
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      const gradesPayload = students.map(s => ({
        student_id: s.student_id,
        score: s.score !== '' ? Number(s.score) : null,
        note: s.note
      }));

      await api.post('/guru/grades/class/save', {
        classId: selectedScheduleInfo.class_id,
        subjectId: selectedScheduleInfo.subject_id,
        type: examType,
        grades: gradesPayload
      });

      setMessage({ type: 'success', text: 'Semua nilai berhasil disimpan!' });
      // Reload grades
      fetchClassGrades();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Gagal menyimpan nilai' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="guru-dashboard-content">
      <h2 className="page-title">📝 Input Nilai Ujian (UTS/UAS)</h2>

      <div className="filter-bar spreadsheet-filter-bar">
        <div className="selectors-group" style={{ flex: 1, justifyContent: 'flex-start' }}>
          <div className="filter-select-wrapper">
            <span className="select-icon material-symbols-outlined">schedule</span>
            <select 
              value={selectedSchedule} 
              onChange={(e) => {
                const id = e.target.value;
                setSelectedSchedule(id);
                const info = schedules.find(s => s.id === id);
                setSelectedScheduleInfo(info);
              }}
              className="modern-select"
              style={{ minWidth: '240px' }}
            >
              {schedules.map(s => (
                <option key={s.id} value={s.id}>{s.class_name} - {s.subject}</option>
              ))}
            </select>
          </div>

          <div className="filter-select-wrapper">
            <span className="select-icon material-symbols-outlined">analytics</span>
            <select value={examType} onChange={(e) => setExamType(e.target.value)} className="modern-select">
              <option value="uts">UTS / Asesmen Tengah Semester (ATS)</option>
              <option value="uas">UAS / Asesmen Akhir Semester (AAS)</option>
            </select>
          </div>
        </div>

        <button 
          className="btn-save" 
          onClick={handleSaveAll} 
          disabled={saving || students.length === 0}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <span className="material-symbols-outlined">save</span>
          {saving ? 'Menyimpan...' : 'Simpan Semua Nilai'}
        </button>
      </div>

      {message.text && (
        <div className={`alert ${message.type}`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="loading">Memuat daftar siswa...</div>
      ) : (
        <div className="student-table-container glass-container">
          <table className="student-table spreadsheet-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: '60px' }}>No</th>
                <th>Nama Siswa</th>
                <th style={{ width: '150px' }}>NIS</th>
                <th style={{ width: '180px' }} className="text-center">Nilai (0-100)</th>
                <th>Catatan / Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {students.length > 0 ? (
                students.map((student, idx) => (
                  <tr key={student.student_id} className="spreadsheet-row">
                    <td className="text-center">{idx + 1}</td>
                    <td className="font-semibold">{student.full_name}</td>
                    <td>{student.nis}</td>
                    <td className="text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={student.score}
                        onChange={(e) => handleScoreChange(idx, e.target.value)}
                        placeholder="Belum ada"
                        className="search-input-modern text-center"
                        style={{ width: '120px', padding: '8px' }}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={student.note}
                        onChange={(e) => handleNoteChange(idx, e.target.value)}
                        placeholder="Contoh: Sangat baik"
                        className="search-input-modern"
                        style={{ padding: '8px' }}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center empty-table-state">
                    <span className="material-symbols-outlined empty-icon">group_off</span>
                    <p>Pilih jadwal ajar terlebih dahulu atau tidak ada siswa dalam kelas ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GuruInputNilai;
