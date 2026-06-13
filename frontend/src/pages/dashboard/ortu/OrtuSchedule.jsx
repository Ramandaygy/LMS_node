import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-schedule.css';

const OrtuSchedule = () => {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState('');
  const [schedules, setSchedules] = useState([]);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [timeSlots] = useState([
    { slot: 1, label: '07:00-08:00' },
    { slot: 2, label: '08:00-09:00' },
    { slot: 3, label: '09:00-10:00' },
    { slot: 4, label: '10:00-11:00' },
    { slot: 5, label: '11:00-12:00' },
    { slot: 6, label: '12:00-13:00' },
  ]);

  const [days] = useState(['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU']);

  useEffect(() => {
    fetchChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      fetchSchedule(selectedChild);
    } else {
      setSchedules([]);
    }
  }, [selectedChild]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/ortu/children');
      const childData = res.data.children || [];
      setChildren(childData);
      if (childData.length > 0) {
        setSelectedChild(childData[0].id);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat data anak' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSchedule = async (childId) => {
    try {
      const res = await api.get(`/schedules/ortu/child/${childId}`);
      if (res.data.success) {
        setSchedules(res.data.schedule || []);
      } else {
        setMessage({ type: 'error', text: 'Gagal memuat jadwal anak' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat jadwal' });
    }
  };

  const getMapelColor = (subjectId) => {
    if (!subjectId) return '#f1f5f9';
    const colors = [
      '#e8f4f8', '#fce4ec', '#e8f5e9', '#fff3e0', '#f3e5f5',
      '#e0f7fa', '#ffebee', '#e0f2f1', '#f9fbe7', '#fde0dc'
    ];
    let hash = 0;
    const str = subjectId.toString();
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const scheduleMap = {};
  schedules.forEach(item => {
    let slot = item.time_slot;
    if (!slot && item.start_time) {
      const slotIndex = timeSlots.findIndex(t => t.label.split('-')[0].trim() === item.start_time);
      slot = slotIndex + 1;
    }
    if (slot && item.day) {
      scheduleMap[`${item.day}_${slot}`] = item;
    }
  });

  if (loading) return <div className="admin-loading">Memuat data...</div>;

  return (
    <div className="schedule-compact" style={{ padding: '20px' }}>
      <div className="compact-header">
        <h2>Jadwal Pelajaran Anak</h2>
        <div className="compact-actions">
          <select 
            value={selectedChild} 
            onChange={(e) => setSelectedChild(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">-- Pilih Anak --</option>
            {children.map(child => (
              <option key={child.id} value={child.id}>
                {child.full_name} ({child.class_name || 'Tidak ada kelas'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {message.text && (
        <div className={`compact-alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      {selectedChild ? (
        <div className="compact-table-wrapper">
          <table className="compact-schedule">
            <thead>
              <tr>
                <th className="time-col">Hari / Jam</th>
                <th className="class-col">Mata Pelajaran</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <React.Fragment key={day}>
                  {timeSlots.map((slot) => {
                    const item = scheduleMap[`${day}_${slot.slot}`];
                    let bgColor = '#fff';
                    let subjectCode = '—';
                    let teacherCode = '-';
                    
                    if (item) {
                      const subject = item.subject_id;
                      const teacher = item.teacher_id;
                      bgColor = getMapelColor(subject ? subject._id : '');
                      subjectCode = subject ? (subject.code || subject.name) : '—';
                      if (teacher) {
                        teacherCode = teacher.full_name || teacher.teacher_code || teacher.username || '-';
                      }
                    }

                    return (
                      <tr key={`${day}_${slot.slot}`}>
                        <td className="time-cell">
                          <div className="day-name">{day}</div>
                          <div className="time-range">{item?.start_time ? `${item.start_time}-${item.end_time}` : slot.label}</div>
                        </td>
                        <td 
                          className="assignment-cell" 
                          style={{ backgroundColor: item ? bgColor : '#fff', cursor: 'default' }}
                        >
                          {item ? (
                            <>
                              <div className="cell-subject">{subjectCode}</div>
                              <div className="cell-teacher">{teacherCode}</div>
                              {item.room && <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>Ruang: {item.room}</div>}
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Silakan pilih anak untuk melihat jadwal.
        </div>
      )}
    </div>
  );
};

export default OrtuSchedule;
