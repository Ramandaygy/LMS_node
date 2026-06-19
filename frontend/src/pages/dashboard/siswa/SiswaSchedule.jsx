import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import '../../../styles/dashboard/admin/admin-schedule.css';

const SiswaSchedule = () => {
  const [loading, setLoading] = useState(true);
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
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get('/schedules/siswa/weekly');
      if (res.data.success) {
        setSchedules(res.data.schedule || []);
      } else {
        setMessage({ type: 'error', text: 'Gagal memuat jadwal' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat jadwal' });
    } finally {
      setLoading(false);
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

  // Build a lookup map for easy rendering
  // key: "DAY_SLOT" -> value: schedule item
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

  if (loading) return <div className="admin-loading">Memuat jadwal...</div>;

  return (
    <div className="schedule-compact" style={{ padding: '20px' }}>
      <div className="compact-header" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', color: '#1e293b', fontWeight: 'bold' }}>Jadwal Pelajaran Saya</h2>
      </div>

      {message.text && (
        <div className={`compact-alert ${message.type}`}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })}>×</button>
        </div>
      )}

      <div className="compact-table-wrapper" style={{ borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
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
                  const item = scheduleMap[`${day}_${slot.slot}`];
                  let bgColor = '#fff';
                  let subjectName = '—';
                  let teacherName = '-';
                  
                  if (item) {
                    const subject = item.subject_id;
                    const teacher = item.teacher_id;
                    bgColor = getMapelColor(subject ? subject._id : '');
                    subjectName = subject ? (subject.name || subject.code) : '—';
                    if (teacher) {
                      teacherName = teacher.full_name || teacher.username || teacher.teacher_code || '-';
                    }
                  }

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
                          {item?.start_time ? `${item.start_time}-${item.end_time}` : slot.label}
                        </div>
                      </td>
                      <td style={{ backgroundColor: item ? bgColor : '#fff', padding: '16px', borderLeft: item ? '4px solid #3b82f6' : 'none' }}>
                        {item ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ fontWeight: '600', fontSize: '15px', color: '#0f172a' }}>{subjectName}</div>
                            <div style={{ fontSize: '14px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person</span>
                              {teacherName}
                            </div>
                            {item.room && (
                              <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>meeting_room</span>
                                Ruang: {item.room}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ color: '#cbd5e1', fontStyle: 'italic', fontSize: '14px' }}>Tidak ada jadwal</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SiswaSchedule;
