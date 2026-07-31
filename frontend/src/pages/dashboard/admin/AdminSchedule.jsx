import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-schedule.css';
import '../../../styles/dashboard/admin/admin-students.css';

const AdminSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [allClasses, setAllClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('7');
  const [selectedClass, setSelectedClass] = useState('all');
  const [importLoading, setImportLoading] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const fileInputRef = React.createRef();
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef(null);

  const [scheduleData, setScheduleData] = useState({});
  const [piketData, setPiketData] = useState({});

  // ============================================================
  // TIME SLOTS SESUAI JADWAL ASLI (format dengan titik)
  // ============================================================
  const [timeSlots, setTimeSlots] = useState([
    { slot: 1, start: '07:20', end: '08:00', label: '07.20-08.00' },
    { slot: 2, start: '08:00', end: '08:40', label: '08.00-08.40' },
    { slot: 3, start: '08:40', end: '09:20', label: '08.40-09.20' },
    { slot: 4, start: '09:40', end: '10:20', label: '09.40-10.20' },
    { slot: 5, start: '10:20', end: '11:00', label: '10.20-11.00' },
    { slot: 6, start: '11:00', end: '11:40', label: '11.00-11.40' },
    { slot: 7, start: '12:10', end: '12:50', label: '12.10-12.50' },
    { slot: 8, start: '12:50', end: '13:30', label: '12.50-13.30' },
  ]);

  // ============================================================
  // SPECIAL TIME SLOTS (Tadarus, Upacara, Istirahat, Jum'at)
  // ============================================================
  const specialTimeSlots = {
    'SENIN': [
      { slot: 'upacara', start: '07:00', end: '07:20', label: '07.00-07.20', isSpecial: true, text: 'UPACARA BENDERA' }
    ],
    'SELASA': [
      { slot: 'tadarus', start: '07:00', end: '07:20', label: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' }
    ],
    'RABU': [
      { slot: 'tadarus', start: '07:00', end: '07:20', label: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' }
    ],
    'KAMIS': [
      { slot: 'tadarus', start: '07:00', end: '07:20', label: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' }
    ],
    'JUMAT': [
      { slot: 'jumat', start: '07:00', end: '09:00', label: '07.00-09.00', isSpecial: true, text: 'JUMAT BERSIH / SEHAT, SHOLAT DHUHA, ISTIGHOSAH' }
    ],
    'SABTU': [
      { slot: 'tadarus', start: '07:00', end: '07:20', label: '07.00-07.20', isSpecial: true, text: 'TADARUS AL QUR\'AN' }
    ]
  };

  // Break slots
  const breakSlots = {
    'SENIN': [
      { slot: 'break1', start: '09:20', end: '09:40', label: '09.20-09.40', text: 'ISTIRAHAT' },
      { slot: 'break2', start: '11:40', end: '12:10', label: '11.40-12.10', text: 'ISTIRAHAT / SHOLAT DHUHUR' }
    ],
    'SELASA': [
      { slot: 'break1', start: '09:20', end: '09:40', label: '09.20-09.40', text: 'ISTIRAHAT' },
      { slot: 'break2', start: '11:40', end: '12:10', label: '11.40-12.10', text: 'ISTIRAHAT / SHOLAT DHUHUR' }
    ],
    'RABU': [
      { slot: 'break1', start: '09:20', end: '09:40', label: '09.20-09.40', text: 'ISTIRAHAT' },
      { slot: 'break2', start: '11:40', end: '12:10', label: '11.40-12.10', text: 'ISTIRAHAT / SHOLAT DHUHUR' }
    ],
    'KAMIS': [
      { slot: 'break1', start: '09:20', end: '09:40', label: '09.20-09.40', text: 'ISTIRAHAT' },
      { slot: 'break2', start: '11:40', end: '12:10', label: '11.40-12.10', text: 'ISTIRAHAT / SHOLAT DHUHUR' }
    ],
    'JUMAT': [],
    'SABTU': [
      { slot: 'break1', start: '09:20', end: '09:40', label: '09.20-09.40', text: 'ISTIRAHAT' },
      { slot: 'break2', start: '11:00', end: '11:15', label: '11.00-11.15', text: '' }
    ]
  };

  const [days] = useState(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);

  const [modal, setModal] = useState({
    open: false,
    day: '',
    timeSlot: null,
    classId: null,
    subjectId: '',
    teacherId: '',
    room: ''
  });

  const [message, setMessage] = useState({ type: '', text: '' });
  const [saving, setSaving] = useState(false);

  const getMapelColor = (subjectId) => {
    if (!subjectId) return '#f1f5f9';
    const colors = [
      '#e8f4f8', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5',
      '#e0f7fa', '#ffebee', '#e0f2f1', '#f9fbe7', '#fde0dc',
      '#e3f2fd', '#f3e5f5', '#e8f5e9', '#fff8e1', '#fbe9e7'
    ];
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
      hash = ((hash << 5) - hash) + subjectId.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedYear) fetchExistingSchedule();
  }, [selectedYear]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes, teachersRes, yearsRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/users/teachers/all'),
        api.get('/academic-years')
      ]);
      setAllClasses(classesRes.data.data || []);
      setSubjects(subjectsRes.data.data || []);
      const teacherData = (teachersRes.data.data || []).map(t => ({
        ...t,
        id: t._id,
        subjects: t.subject_ids || []
      }));
      setTeachers(teacherData);
      const years = yearsRes.data.academic_years || yearsRes.data.data || [];
      setAcademicYears(years);
      const activeYear = years.find(y => y.is_active);
      if (activeYear) {
        setSelectedYear(activeYear._id || activeYear.id);
      } else if (years.length > 0) {
        setSelectedYear(years[0]._id || years[0].id);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat data master' });
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingSchedule = async () => {
    if (!selectedYear) return;
    try {
      const res = await api.get(`/schedules?academic_year_id=${selectedYear}`);
      const schedules = res.data.data || [];
      const newData = {};
      const piketMap = {};

      schedules.forEach(item => {
        let slot = item.time_slot;
        if (!slot && item.start_time) {
          // Cocokkan dengan format yang ada di timeSlots
          const slotIndex = timeSlots.findIndex(
            t => t.start === item.start_time
          );
          slot = slotIndex + 1;
        }
        if (!slot) return;
        
        const classId = (item.class_id?._id || item.class_id)?.toString();
        const subjectId = (item.subject_id?._id || item.subject_id)?.toString();
        const teacherId = (item.teacher_id?._id || item.teacher_id)?.toString();
        if (!classId) return;
        
        const key = `${item.day}_${slot}_${classId}`;
        newData[key] = {
          subjectId: subjectId || '',
          teacherId: teacherId || '',
          room: item.room || ''
        };

        // Simpan piket
        if (item.piket_teacher_id) {
          const piketKey = `${item.day}_${slot}`;
          if (!piketMap[piketKey]) piketMap[piketKey] = [];
          const piketId = (item.piket_teacher_id?._id || item.piket_teacher_id)?.toString();
          if (piketId && !piketMap[piketKey].includes(piketId)) {
            piketMap[piketKey].push(piketId);
          }
        }
      });

      setScheduleData(newData);
      setPiketData(piketMap);
    } catch (err) {
      console.error('FETCH SCHEDULE ERROR', err);
    }
  };

  const classes = allClasses.filter(cls => {
    if (cls.is_active === false) return false;
    if (selectedGrade === 'all') return true;
    return String(cls.grade_level) === selectedGrade;
  });

  const sortedClasses = [...classes].sort((a, b) => {
    if (a.grade_level !== b.grade_level) return a.grade_level - b.grade_level;
    return a.name.localeCompare(b.name);
  });

  const handleCellClick = (day, timeSlot, classId, currentSubjectId, currentTeacherId, currentRoom) => {
    setModal({
      open: true, day, timeSlot, classId,
      subjectId: currentSubjectId || '',
      teacherId: currentTeacherId || '',
      room: currentRoom || ''
    });
  };

  const handleModalChange = (field, value) => {
    setModal({ ...modal, [field]: value });
  };

  const getAvailableTeachers = (subjectId) => {
    if (!subjectId) return [];
    return teachers.filter(teacher => {
      const subs = teacher.subject_ids || teacher.subjects || [];
      return subs.includes(subjectId);
    });
  };

  const saveSchedule = () => {
    const { day, timeSlot, classId, subjectId, teacherId, room } = modal;
    const key = `${day}_${timeSlot}_${classId}`;
    setScheduleData(prev => ({
      ...prev,
      [key]: { subjectId, teacherId, room: room || '' }
    }));
    setModal({ open: false, day: '', timeSlot: null, classId: null, subjectId: '', teacherId: '', room: '' });
  };

  const handleSaveAll = async () => {
    try {
      setSaving(true);
      let yearToSave = selectedYear;
      if (!yearToSave && academicYears.length > 0) {
        const active = academicYears.find(y => y.is_active) || academicYears[0];
        yearToSave = active._id || active.id;
      }

      const schedules = [];
      Object.entries(scheduleData).forEach(([key, value]) => {
        if (!value.subjectId || !value.teacherId) return;
        const [day, slot, classId] = key.split('_');
        const time = timeSlots.find(t => t.slot === Number(slot));
        if (!time) return;
        schedules.push({
          class_id: classId,
          subject_id: value.subjectId,
          teacher_id: value.teacherId,
          academic_year_id: yearToSave,
          day,
          time_slot: Number(slot),
          start_time: time.start,
          end_time: time.end,
          room: value.room || '',
          generated_type: 'manual'
        });
      });

      if (schedules.length === 0) {
        setMessage({ type: 'error', text: 'Belum ada mata pelajaran & guru yang di-assign pada jadwal' });
        return;
      }

      await api.post('/schedules/bulk', { schedules });
      setMessage({ type: 'success', text: 'Jadwal berhasil disimpan' });
      await fetchExistingSchedule();
    } catch (err) {
      console.error(err);
      const errorMsg = err.response?.data?.message || err.message || 'Gagal menyimpan jadwal';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setTemplateLoading(true);
      const response = await api.get('/admin/export/schedules-template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_import_jadwal.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Gagal mendownload template' });
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setImportLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await api.post('/admin/import/schedules', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { success_count, error_count, errors } = response.data;
      if (success_count > 0 && error_count > 0) {
        setMessage({ 
          type: 'success', 
          text: `Import selesai: ${success_count} berhasil dimasukkan, namun ${error_count} baris gagal. Kesalahan pertama: ${errors.slice(0, 2).join(', ')}` 
        });
      } else if (success_count > 0) {
        setMessage({ type: 'success', text: `Berhasil mengimport ${success_count} jadwal pelajaran!` });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Gagal mengimport jadwal. Kesalahan: ${errors.slice(0, 5).join(', ')}` 
        });
      }
      await fetchExistingSchedule();
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Gagal mengimport file' });
    } finally {
      setImportLoading(false);
      event.target.value = '';
    }
  };

  const handleTimeEdit = (slotIndex) => {
    const newStart = prompt('Edit waktu mulai (format HH:MM):', timeSlots[slotIndex].start);
    if (newStart) {
      const newEnd = prompt('Edit waktu selesai (format HH:MM):', timeSlots[slotIndex].end);
      if (newEnd) {
        if (newStart < '07:00' || newEnd > '15:00') {
          alert('Waktu harus di rentang 07:00 - 15:00');
          return;
        }
        const updated = [...timeSlots];
        updated[slotIndex].start = newStart;
        updated[slotIndex].end = newEnd;
        updated[slotIndex].label = `${newStart}-${newEnd}`;
        setTimeSlots(updated);
      }
    }
  };

  // ============================================================
  // RENDER GRID VIEW (SATU-SATUNYA VIEW)
  // ============================================================
  const renderGridView = () => {
    return (
      <table className="compact-schedule">
        <thead>
          <tr>
            <th className="time-col">Hari / Jam</th>
            {sortedClasses.map(c => <th key={c._id} className="class-col">{c.name}</th>)}
            <th className="piket-col" style={{ minWidth: '60px', backgroundColor: '#fef3c7' }}>PIKET</th>
          </tr>
        </thead>
        <tbody>
          {days.map(day => {
            const specials = specialTimeSlots[day] || [];
            const breaks = breakSlots[day] || [];
            const allSlots = [
              ...specials.map(t => ({ ...t, isSpecial: true })),
              ...timeSlots.map(t => ({ ...t, isRegular: true })),
              ...breaks.map(t => ({ ...t, isBreak: true }))
            ].sort((a, b) => {
              const aTime = a.start || '00:00';
              const bTime = b.start || '00:00';
              return aTime.localeCompare(bTime);
            });

            return allSlots.map((slot, idx) => {
              const isFirstRow = idx === 0;
              const isSpecial = slot.isSpecial;
              const isBreak = slot.isBreak;
              const piketKey = `${day}_${slot.slot}`;
              const piketTeachers = piketData[piketKey] || [];

              return (
                <tr key={`${day}_${slot.slot || idx}`} style={{ 
                  backgroundColor: isBreak ? '#f8fafc' : 'transparent'
                }}>
                  <td className="time-cell" onClick={() => handleTimeEdit(idx)} title="Klik untuk edit waktu">
                    <div className="day-name">{isFirstRow ? day : ''}</div>
                    <div className="time-range">{slot.label}</div>
                  </td>

                  {sortedClasses.map(cls => {
                    const key = `${day}_${slot.slot}_${cls._id}`;
                    const data = scheduleData[key] || {};
                    const subject = subjects.find(s => s._id === data.subjectId);
                    const teacher = teachers.find(t => t._id === data.teacherId || t.id === data.teacherId);
                    
                    // Tampilkan nama lengkap, bukan kode
                    const displaySubject = subject?.name || subject?.code || '—';
                    const displayTeacher = teacher?.full_name || teacher?.username || '-';
                    
                    const bgColor = getMapelColor(data.subjectId);

                    if (isBreak) {
                      return (
                        <td
                          key={cls._id}
                          className="assignment-cell break-cell"
                          style={{ backgroundColor: '#f1f5f9', textAlign: 'center', fontSize: '10px', color: '#64748b' }}
                        >
                          {slot.text}
                        </td>
                      );
                    }

                    if (isSpecial) {
                      return (
                        <td
                          key={cls._id}
                          className="assignment-cell special-cell"
                          style={{ backgroundColor: '#fef3c7', textAlign: 'center', fontSize: '9px', color: '#92400e' }}
                        >
                          {slot.text}
                        </td>
                      );
                    }

                    return (
                      <td
                        key={cls._id}
                        className="assignment-cell"
                        style={{ backgroundColor: data.subjectId ? bgColor : '#fff' }}
                        onClick={() => handleCellClick(day, slot.slot, cls._id, data.subjectId, data.teacherId, data.room)}
                      >
                        <div className="cell-subject" title={displaySubject}>{displaySubject}</div>
                        <div className="cell-teacher" title={displayTeacher}>{displayTeacher}</div>
                        {data.room && (
                          <div className="cell-room" style={{ fontSize: '7px', color: '#94a3b8' }}>
                            {data.room}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Kolom PIKET */}
                  <td className="piket-cell" style={{ 
                    textAlign: 'center', 
                    fontSize: '10px', 
                    backgroundColor: '#fef3c7',
                    padding: '4px',
                    minWidth: '60px'
                  }}>
                    {piketTeachers.length > 0 ? (
                      piketTeachers.map((pid, i) => {
                        const teacher = teachers.find(t => t._id === pid);
                        return (
                          <div key={i} style={{ fontSize: '9px', color: '#92400e' }}>
                            {teacher?.full_name || teacher?.username || teacher?.teacher_code || '-'}
                          </div>
                        );
                      })
                    ) : (
                      <span style={{ color: '#d1d5db' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    );
  };

  if (loading) return <div className="admin-loading">Memuat data...</div>;

  return (
    <div className="schedule-compact">
      <div className="compact-header">
        <h2>Penjadwalan Mengajar</h2>
        <div className="compact-actions">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx" 
            style={{ display: 'none' }} 
          />
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">Pilih Tahun Ajaran</option>
            {academicYears.map(y => (
              <option key={y._id} value={y._id}>
                {y.year} - {y.semester} {y.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>
          <select 
            value={selectedGrade} 
            onChange={e => {
              setSelectedGrade(e.target.value);
              setSelectedClass('all');
            }}
          >
            <option value="7">Kelas 7</option>
            <option value="8">Kelas 8</option>
            <option value="9">Kelas 9</option>
            <option value="all">Semua</option>
          </select>
          <select 
            value={selectedClass} 
            onChange={e => setSelectedClass(e.target.value)}
            style={{ minWidth: '130px' }}
          >
            <option value="all">Semua Kelas</option>
            {sortedClasses.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <div className="dropdown" ref={actionsRef} style={{ marginLeft: '8px' }}>
            <button className="dropdown-btn" onClick={() => setActionsOpen(!actionsOpen)}>
              <span className="material-symbols-outlined">file_present</span> Data
              <span className="material-symbols-outlined dropdown-arrow">expand_more</span>
            </button>
            {actionsOpen && (
              <div className="dropdown-menu">
                <div className="dropdown-group">
                  <div className="dropdown-group-title">IMPORT</div>
                  <button onClick={() => { setActionsOpen(false); handleImportClick(); }} disabled={importLoading}>
                    <span className="material-symbols-outlined">upload_file</span>
                    {importLoading ? 'Mengimport...' : 'Import Jadwal (Excel)'}
                  </button>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-group">
                  <div className="dropdown-group-title">TEMPLATE</div>
                  <button onClick={() => { setActionsOpen(false); handleDownloadTemplate(); }} disabled={templateLoading}>
                    <span className="material-symbols-outlined">description</span>
                    {templateLoading ? 'Memproses...' : 'Download Template Excel'}
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className="admin-add-user-btn" onClick={handleSaveAll} disabled={saving} style={{ background: '#0284c7', color: '#fff', borderRadius: '12px' }}>
            <span className="material-symbols-outlined">save</span> {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`compact-alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="compact-table-wrapper">
        {renderGridView()}
      </div>

      {modal.open && (
        <div className="modal-overlay" onClick={() => setModal({ ...modal, open: false })}>
          <div className="modal-content compact-modal" onClick={e => e.stopPropagation()}>
            <h3>Assign Jadwal</h3>
            <p>
              <strong>{modal.day} - {timeSlots.find(s => s.slot === modal.timeSlot)?.label}</strong>
              {' '}| Kelas {allClasses.find(c => c._id && c._id.toString() === String(modal.classId))?.name}
            </p>
            <select value={modal.subjectId} onChange={e => handleModalChange('subjectId', e.target.value)}>
              <option value="">Pilih Mata Pelajaran</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
            </select>
            <select
              value={modal.teacherId}
              onChange={e => handleModalChange('teacherId', e.target.value)}
              disabled={!modal.subjectId}
            >
              <option value="">Pilih Guru</option>
              {getAvailableTeachers(modal.subjectId).map(t => {
                const displayCode = t.teacher_code || t.nip || t.username || `G${t._id.slice(-4)}`;
                return <option key={t._id} value={t._id}>{displayCode} - {t.full_name}</option>;
              })}
              {modal.subjectId && getAvailableTeachers(modal.subjectId).length === 0 && (
                <option disabled>Tidak ada guru untuk mapel ini</option>
              )}
            </select>
            <input
              type="text"
              placeholder="Ruang (opsional)"
              value={modal.room}
              onChange={e => handleModalChange('room', e.target.value)}
            />
            <div className="modal-buttons">
              <button onClick={() => setModal({ ...modal, open: false })}>Batal</button>
              <button onClick={saveSchedule} disabled={!modal.subjectId || !modal.teacherId}>Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedule;