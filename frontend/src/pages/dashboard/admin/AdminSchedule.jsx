import React, { useState, useEffect } from 'react';
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

  const [scheduleData, setScheduleData] = useState({});

  const [timeSlots, setTimeSlots] = useState([
    { slot: 1, label: '07:00-08:00' },
    { slot: 2, label: '08:00-09:00' },
    { slot: 3, label: '09:00-10:00' },
    { slot: 4, label: '10:00-11:00' },
    { slot: 5, label: '11:00-12:00' },
    { slot: 6, label: '12:00-13:00' },
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
        const classId = item.class_id?._id || item.class_id;
        const subjectId = item.subject_id?._id || item.subject_id;
        const teacherId = item.teacher_id?._id || item.teacher_id;
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
    const yearMatch =
      cls.academic_year_id === selectedYear ||
      cls.academic_year_id?._id === selectedYear ||
      cls.academic_year?._id === selectedYear;
    if (!yearMatch) return false;
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
          <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
            <option value="">Pilih Tahun Ajaran</option>
            {academicYears.map(y => (
              <option key={y._id} value={y._id}>
                {y.year} - {y.semester} {y.is_active ? '(Aktif)' : ''}
              </option>
            ))}
          </select>
          <select value={selectedGrade} onChange={e => setSelectedGrade(e.target.value)}>
            <option value="7">Kelas 7</option>
            <option value="8">Kelas 8</option>
            <option value="9">Kelas 9</option>
            <option value="all">Semua</option>
          </select>

          <button onClick={handleSaveAll} disabled={saving}>
            {saving ? '...' : '💾 Simpan'}
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
      </div>

      {modal.open && (
        <div className="modal-overlay" onClick={() => setModal({ ...modal, open: false })}>
          <div className="modal-content compact-modal" onClick={e => e.stopPropagation()}>
            <h3>Assign Jadwal</h3>
            <p>
              <strong>{modal.day} - {timeSlots.find(s => s.slot === modal.timeSlot)?.label}</strong>
              {' '}| Kelas {allClasses.find(c => c._id === modal.classId)?.name}
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