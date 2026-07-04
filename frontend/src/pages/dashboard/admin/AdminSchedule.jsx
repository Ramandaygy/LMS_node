import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-schedule.css';

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

  const [timeSlots, setTimeSlots] = useState([
    { slot: 1, label: '07:20-08:00' },
    { slot: 2, label: '08:00-08:40' },
    { slot: 3, label: '08:40-09:20' },
    { slot: 4, label: '09:40-10:20' },
    { slot: 5, label: '10:20-11:00' },
    { slot: 6, label: '11:00-11:40' },
    { slot: 7, label: '12:10-12:50' },
    { slot: 8, label: '12:50-13:30' },
  ]);

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
      '#e0f7fa', '#ffebee', '#e0f2f1', '#f9fbe7', '#fde0dc'
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
      const years = yearsRes.data.academic_years || [];
      setAcademicYears(years);
      const activeYear = years.find(y => y.is_active);
      if (activeYear) setSelectedYear(activeYear._id);
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
      schedules.forEach(item => {
        let slot = item.time_slot;
        if (!slot && item.start_time) {
          const slotIndex = timeSlots.findIndex(
            t => t.label.split('-')[0].trim() === item.start_time
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
      });
      setScheduleData(newData);
    } catch (err) {
      console.error('FETCH SCHEDULE ERROR', err);
    }
  };

  const classes = allClasses.filter(cls => {
    // Tampilkan semua kelas yang aktif di sekolah
    if (cls.is_active === false) return false;
    
    if (selectedGrade === 'all') return true;
    return String(cls.grade_level) === selectedGrade;
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
      const schedules = [];
      Object.entries(scheduleData).forEach(([key, value]) => {
        if (!value.subjectId || !value.teacherId) return;
        const [day, slot, classId] = key.split('_');
        const time = timeSlots.find(t => t.slot === Number(slot));
        if (!time) return;
        const [start_time, end_time] = time.label.split('-');
        schedules.push({
          class_id: classId,
          subject_id: value.subjectId,
          teacher_id: value.teacherId,
          academic_year_id: selectedYear,
          day,
          time_slot: Number(slot),
          start_time: start_time.trim(),
          end_time: end_time.trim(),
          room: value.room || ''
        });
      });
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
      link.setAttribute('download', 'template_jadwal.xlsx');
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
      event.target.value = ''; // Reset file input
    }
  };



  const handleTimeEdit = (slotIndex) => {
    const newLabel = prompt('Edit waktu:', timeSlots[slotIndex].label);
    if (newLabel) {
      const updated = [...timeSlots];
      updated[slotIndex].label = newLabel;
      setTimeSlots(updated);
    }
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
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>

          <div className="compact-dropdown-wrapper" ref={actionsRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setActionsOpen(!actionsOpen)} 
              className="actions-trigger-btn"
              style={{ 
                background: '#0284c7', 
                color: '#fff', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>settings</span>
              Aksi Jadwal
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>keyboard_arrow_down</span>
            </button>
            
            {actionsOpen && (
              <div 
                className="actions-dropdown-menu"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '6px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  zIndex: 1000,
                  minWidth: '180px',
                  overflow: 'hidden'
                }}
              >
                <button 
                  onClick={() => { setActionsOpen(false); handleSaveAll(); }}
                  disabled={saving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#334155',
                    fontSize: '14px'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#10b981' }}>save</span>
                  {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
                </button>
                
                <button 
                  onClick={() => { setActionsOpen(false); handleDownloadTemplate(); }}
                  disabled={templateLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#334155',
                    fontSize: '14px',
                    borderTop: '1px solid #f1f5f9'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#64748b' }}>description</span>
                  {templateLoading ? 'Memproses...' : 'Unduh Template'}
                </button>
                
                <button 
                  onClick={() => { setActionsOpen(false); handleImportClick(); }}
                  disabled={importLoading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 16px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: '#334155',
                    fontSize: '14px',
                    borderTop: '1px solid #f1f5f9'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#0284c7' }}>upload_file</span>
                  {importLoading ? 'Memproses...' : 'Import Excel'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`compact-alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="compact-table-wrapper">
        {selectedClass === 'all' ? (
          <table className="compact-schedule">
            <thead>
              <tr>
                <th className="time-col">Hari / Jam</th>
                {classes.map(c => <th key={c._id} className="class-col">{c.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <React.Fragment key={day}>
                  {timeSlots.map((slot, idx) => (
                    <tr key={`${day}_${slot.slot}`}>
                      <td className="time-cell" onClick={() => handleTimeEdit(idx)} title="Klik untuk edit waktu">
                        <div className="day-name">{day}</div>
                        <div className="time-range">{slot.label}</div>
                      </td>
                      {classes.map(cls => {
                        const key = `${day}_${slot.slot}_${cls._id}`;
                        const data = scheduleData[key] || {};
                        const subject = subjects.find(s => s._id === data.subjectId);
                        const teacher = teachers.find(t => t._id === data.teacherId || t.id === data.teacherId);
                        const subjectCode = subject?.code || (subject?.name?.slice(0, 4) || '—');
                        let teacherCode = '-';
                        if (teacher) {
                          teacherCode = teacher.teacher_code || teacher.code || teacher.kode_guru || teacher.username || '-';
                        }
                        const bgColor = getMapelColor(data.subjectId);
                        return (
                          <td
                            key={cls._id}
                            className="assignment-cell"
                            style={{ backgroundColor: data.subjectId ? bgColor : '#fff' }}
                            onClick={() => handleCellClick(day, slot.slot, cls._id, data.subjectId, data.teacherId, data.room)}
                          >
                            <div className="cell-subject">{subjectCode}</div>
                            <div className="cell-teacher">{teacherCode}</div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="compact-schedule" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ width: '15%', padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Hari</th>
                <th style={{ width: '20%', padding: '16px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>Jam</th>
                <th style={{ width: '65%', padding: '16px', textAlign: 'left', color: '#475569', fontWeight: '600' }}>Mata Pelajaran & Guru</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <React.Fragment key={day}>
                  {timeSlots.map((slot, index) => {
                    const key = `${day}_${slot.slot}_${selectedClass}`;
                    const data = scheduleData[key] || {};
                    const subject = subjects.find(s => s._id === data.subjectId);
                    const teacher = teachers.find(t => t._id === data.teacherId || t.id === data.teacherId);
                    const bgColor = getMapelColor(data.subjectId);
                    
                    return (
                      <tr key={`${day}_${slot.slot}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        {index === 0 && (
                          <td 
                            rowSpan={timeSlots.length} 
                            style={{ 
                              verticalAlign: 'middle', 
                              fontWeight: 'bold', 
                              backgroundColor: '#f8fafc', 
                              borderRight: '1px solid #e2e8f0', 
                              textAlign: 'center',
                              padding: '16px',
                              color: '#334155'
                            }}
                          >
                            {day}
                          </td>
                        )}
                        <td style={{ textAlign: 'center', padding: '16px', borderRight: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: '500', color: '#475569' }}>
                            {slot.label}
                          </div>
                        </td>
                        <td 
                          style={{ 
                            backgroundColor: data.subjectId ? bgColor : '#fff', 
                            padding: '16px', 
                            borderLeft: data.subjectId ? '4px solid #3b82f6' : 'none',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleCellClick(day, slot.slot, selectedClass, data.subjectId, data.teacherId, data.room)}
                        >
                          {data.subjectId ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>
                                {subject?.name || subject?.code || '—'}
                              </div>
                              <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
                                {teacher?.full_name || teacher?.username || '-'}
                              </div>
                              {data.room && (
                                <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>meeting_room</span>
                                  Ruang: {data.room}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: '14px' }}>Klik untuk tambah jadwal</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
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
                const displayCode = t.nip || t.username || t.teacher_code || `G${t._id.slice(-4)}`;
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