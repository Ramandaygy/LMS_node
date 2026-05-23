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

  const [days] = useState([
    'SENIN',
    'SELASA',
    'RABU',
    'KAMIS',
    'JUMAT',
    'SABTU'
  ]);

  const [modal, setModal] = useState({
    open: false,
    day: '',
    timeSlot: null,
    classId: null,
    subjectId: '',
    teacherId: ''
  });

  const [message, setMessage] = useState({
    type: '',
    text: ''
  });

  const [autoLoading, setAutoLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getMapelColor = (subjectId) => {
    if (!subjectId) return '#f1f5f9';

    const colors = [
      '#e8f4f8',
      '#fce4ec',
      '#e8f5e9',
      '#fff3e0',
      '#f3e5f5',
      '#e0f7fa',
      '#ffebee',
      '#e0f2f1',
      '#f9fbe7',
      '#fde0dc'
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
    if (selectedYear) {
      fetchExistingSchedule();
    }
  }, [selectedYear]);

  const fetchInitialData = async () => {
    try {

      const [
        classesRes,
        subjectsRes,
        teachersRes,
        yearsRes
      ] = await Promise.all([
        api.get('/admin/classes/options'),
        api.get('/admin/subjects/options'),
        api.get('/admin/users/teachers?limit=200'),
        api.get('/admin/academic-years'),
      ]);

      setAllClasses(classesRes.data.classes || []);
      setSubjects(subjectsRes.data.subjects || []);

      // NORMALISASI DATA GURU
      const teachersData = (teachersRes.data.teachers || []).map(t => ({
        ...t,
        id: t._id || t.id,
        // Gunakan subject_ids (yang berisi ID mapel) untuk filter
        subjects: t.subject_ids || []
      }));
  

      setTeachers(teachersData);

      // =========================
      // FIX ACADEMIC YEAR
      // =========================

      const years = yearsRes.data.academic_years || [];

      setAcademicYears(years);

      // sekarang pakai is_active
      const activeYear = years.find(y => y.is_active);

      if (activeYear) {
        setSelectedYear(activeYear._id);
      }

      setLoading(false);

    } catch (error) {
      console.error(error);

      setMessage({
        type: 'error',
        text: 'Gagal memuat data master'
      });

      setLoading(false);
    }
  };

  const fetchExistingSchedule = async () => {

    if (!selectedYear) return;

    try {

      const res = await api.get(
        `/admin/schedule?academic_year_id=${selectedYear}`
      );

      const schedule = res.data.schedule || [];

      const newData = {};

      schedule.forEach(ass => {

        // fallback jika backend tidak kirim time_slot
        let slot = ass.time_slot;

        if (!slot && ass.start_time) {
          const found = timeSlots.find(t => {
            return t.label.split('-')[0] === ass.start_time;
          });

          slot = found?.slot;
        }

        const key = `${ass.day}_${slot}_${ass.class_id}`;

        newData[key] = {
          subjectId: ass.subject_id,
          teacherId: ass.teacher_id
        };

      });

      setScheduleData(newData);

    } catch (error) {
      console.error('Error fetching schedule', error);
    }
  };

  const classes = allClasses.filter(cls => {

    if (selectedGrade === 'all') return true;

    const match = cls.name.match(/^\d+/);

    return match && match[0] === selectedGrade;
  });

  const handleCellClick = (
    day,
    timeSlot,
    classId,
    currentSubjectId,
    currentTeacherId
  ) => {

    setModal({
      open: true,
      day,
      timeSlot,
      classId,
      subjectId: currentSubjectId || '',
      teacherId: currentTeacherId || '',
    });
  };

  const handleModalChange = (field, value) => {
    setModal({
      ...modal,
      [field]: value
    });
  };

  // FILTER GURU BERDASARKAN SUBJECT
  const getAvailableTeachers = (subjectId) => {

    if (!subjectId) return [];

    return teachers.filter(t => {

      if (!t.subjects) return false;

      return t.subjects.includes(subjectId);

    });
  };

  const saveSchedule = () => {

    const {
      day,
      timeSlot,
      classId,
      subjectId,
      teacherId
    } = modal;

    const key = `${day}_${timeSlot}_${classId}`;

    setScheduleData(prev => ({
      ...prev,
      [key]: {
        subjectId,
        teacherId
      }
    }));

    setModal({
      open: false,
      day: '',
      timeSlot: null,
      classId: null,
      subjectId: '',
      teacherId: ''
    });
  };

  const handleSaveAll = async () => {

    if (!selectedYear) {

      return setMessage({
        type: 'error',
        text: 'Pilih tahun ajaran'
      });

    }

    setSaving(true);

    const scheduleToSave = [];

    for (const [key, value] of Object.entries(scheduleData)) {

      if (!value.subjectId || !value.teacherId) continue;

      const [day, timeSlot, classId] = key.split('_');

      scheduleToSave.push({
        day,
        time_slot: parseInt(timeSlot),
        class_id: classId,
        subject_id: value.subjectId,
        teacher_id: value.teacherId,
        academic_year_id: selectedYear,
      });

    }

    try {

      const response = await api.post(
        '/admin/schedule/bulk',
        { schedule: scheduleToSave }
      );

      if (response.status === 200) {

        setMessage({
          type: 'success',
          text: 'Jadwal berhasil disimpan'
        });

        await fetchExistingSchedule();

      } else {

        throw new Error('Gagal simpan');

      }

    } catch (error) {

      console.error(error);

      setMessage({
        type: 'error',
        text: 'Gagal menyimpan jadwal'
      });

    } finally {

      setSaving(false);

    }
  };

  const handleAutoGenerate = async () => {

    if (!selectedYear) {

      return setMessage({
        type: 'error',
        text: 'Pilih tahun ajaran'
      });

    }

    setAutoLoading(true);

    try {

      const response = await api.post(
        '/admin/schedule/auto-generate',
        {
          academic_year_id: selectedYear
        }
      );

      if (response.status === 200) {

        await fetchExistingSchedule();

        setMessage({
          type: 'success',
          text: 'Jadwal digenerate otomatis'
        });

      } else {

        throw new Error('Gagal generate');

      }

    } catch (error) {

      console.error(error);

      setMessage({
        type: 'error',
        text: 'Gagal generate jadwal'
      });

    } finally {

      setAutoLoading(false);

    }
  };

  const handleTimeEdit = (slotIndex) => {

    const newLabel = prompt(
      'Edit waktu:',
      timeSlots[slotIndex].label
    );

    if (newLabel) {

      const updated = [...timeSlots];

      updated[slotIndex].label = newLabel;

      setTimeSlots(updated);

    }
  };

  if (loading) {
    return <div className="admin-loading">Memuat data...</div>;
  }

  return (
    <div className="schedule-compact">

      <div className="compact-header">

        <h2>Penjadwalan Mengajar</h2>

        <div className="compact-actions">

          {/* =========================
              FIX DROPDOWN ACADEMIC YEAR
          ========================== */}

          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
          >

            <option value="">
              Pilih Tahun Ajaran
            </option>

            {academicYears.map(y => (

              <option
                key={y._id}
                value={y._id}
              >

                {/* sekarang pakai year + semester */}
                {y.year} - {y.semester}
                {y.is_active ? ' (Aktif)' : ''}

              </option>

            ))}

          </select>

          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
          >
            <option value="7">Kelas 7</option>
            <option value="8">Kelas 8</option>
            <option value="9">Kelas 9</option>
            <option value="all">Semua</option>
          </select>

          <button
            onClick={handleAutoGenerate}
            disabled={autoLoading}
          >
            {autoLoading ? '...' : '⚡ Generate'}
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? '...' : '💾 Simpan'}
          </button>

        </div>
      </div>

      {message.text && (
        <div className={`compact-alert ${message.type}`}>
          {message.text}
          <button
            onClick={() =>
              setMessage({
                type: '',
                text: ''
              })
            }
          >
            ×
          </button>
        </div>
      )}

      <div className="compact-table-wrapper">

        <table className="compact-schedule">

          <thead>
            <tr>

              <th className="time-col">
                Hari / Jam
              </th>

              {classes.map(c => (
                <th
                  key={c._id}
                  className="class-col"
                >
                  {c.name}
                </th>
              ))}

            </tr>
          </thead>

          <tbody>

            {days.map(day => (
              <React.Fragment key={day}>

                {timeSlots.map((slot, idx) => (

                  <tr key={`${day}_${slot.slot}`}>

                    <td
                      className="time-cell"
                      onClick={() => handleTimeEdit(idx)}
                      title="Klik untuk edit waktu"
                    >

                      <div className="day-name">
                        {day}
                      </div>

                      <div className="time-range">
                        {slot.label}
                      </div>

                    </td>

                    {classes.map(cls => {

                      const key = `${day}_${slot.slot}_${cls._id}`;

                      const data = scheduleData[key] || {};

                      const subject = subjects.find(
                        s => s._id === data.subjectId
                      );

                      const teacher = teachers.find(
                        t => t.id === data.teacherId
                      );

                      const subjectCode =
                        subject?.code ||
                        (subject?.name?.slice(0, 4) || '—');

                      let teacherCode = '—';

                      if (teacher) {

                        teacherCode =
                          teacher.nip ||
                          teacher.username ||
                          teacher.teacher_code ||
                          `G${teacher.id.slice(-4)}`;

                      }

                      const bgColor = getMapelColor(data.subjectId);

                      return (
                        <td
                          key={cls._id}
                          className="assignment-cell"
                          style={{
                            backgroundColor:
                              data.subjectId
                                ? bgColor
                                : '#fff'
                          }}
                          onClick={() =>
                            handleCellClick(
                              day,
                              slot.slot,
                              cls._id,
                              data.subjectId,
                              data.teacherId
                            )
                          }
                        >

                          <div className="cell-subject">
                            {subjectCode}
                          </div>

                          <div className="cell-teacher">
                            {teacherCode}
                          </div>

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

        <div
          className="modal-overlay"
          onClick={() =>
            setModal({
              ...modal,
              open: false
            })
          }
        >

          <div
            className="modal-content compact-modal"
            onClick={e => e.stopPropagation()}
          >

            <h3>Assign Jadwal</h3>

            <p>

              <strong>
                {modal.day} - {
                  timeSlots.find(
                    s => s.slot === modal.timeSlot
                  )?.label
                }
              </strong>

              {' '}| Kelas {
                allClasses.find(
                  c => c._id === modal.classId
                )?.name
              }

            </p>

            <select
              value={modal.subjectId}
              onChange={e =>
                handleModalChange(
                  'subjectId',
                  e.target.value
                )
              }
            >

              <option value="">
                Pilih Mata Pelajaran
              </option>

              {subjects.map(s => (

                <option
                  key={s._id}
                  value={s._id}
                >
                  {s.code} - {s.name}
                </option>

              ))}

            </select>

            <select
              value={modal.teacherId}
              onChange={e =>
                handleModalChange(
                  'teacherId',
                  e.target.value
                )
              }
              disabled={!modal.subjectId}
            >

              <option value="">
                Pilih Guru
              </option>

              {getAvailableTeachers(modal.subjectId).map(t => {

                const displayCode =
                  t.nip ||
                  t.username ||
                  t.teacher_code ||
                  `G${t.id.slice(-4)}`;

                return (
                  <option
                    key={t.id}
                    value={t.id}
                  >
                    {displayCode} - {t.full_name}
                  </option>
                );
              })}

              {modal.subjectId &&
                getAvailableTeachers(modal.subjectId).length === 0 && (
                  <option disabled>
                    Tidak ada guru untuk mapel ini
                  </option>
              )}

            </select>

            <div className="modal-buttons">

              <button
                onClick={() =>
                  setModal({
                    ...modal,
                    open: false
                  })
                }
              >
                Batal
              </button>

              <button
                onClick={saveSchedule}
                disabled={
                  !modal.subjectId ||
                  !modal.teacherId
                }
              >
                Simpan
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSchedule;