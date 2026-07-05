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

  if (loading) return <div className="admin-loading" style={{ padding: '40px', textAlign: 'center' }}>Memuat data...</div>;

  return (
    <div className="schedule-compact" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '28px', color: '#0f172a', fontWeight: 'bold', margin: '0 0 8px 0' }}>Jadwal Pelajaran Anak</h2>
          <p style={{ margin: 0, color: '#64748b' }}>Pantau jadwal pelajaran harian anak Anda</p>
        </div>
      </div>

      {children.length === 0 ? (
        <div style={{ background: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
          Belum ada anak terdaftar.
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', padding: '15px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          {children.map(child => (
            <button 
              key={child.id} 
              onClick={() => setSelectedChild(child.id)}
              style={{
                padding: '10px 20px',
                border: selectedChild === child.id ? '1px solid #3b82f6' : '1px solid #e2e8f0',
                background: selectedChild === child.id ? '#3b82f6' : '#f8fafc',
                color: selectedChild === child.id ? 'white' : '#64748b',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                boxShadow: selectedChild === child.id ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>face</span>
              {child.full_name} ({child.class_name})
            </button>
          ))}
        </div>
      )}

      {message.text && (
        <div className={`compact-alert ${message.type}`} style={{ padding: '12px 20px', borderRadius: '8px', marginBottom: '20px', backgroundColor: message.type === 'error' ? '#fee2e2' : '#d1fae5', color: message.type === 'error' ? '#dc2626' : '#059669', border: `1px solid ${message.type === 'error' ? '#f87171' : '#34d399'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {message.text}
          <button onClick={() => setMessage({ type: '', text: '' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'inherit' }}>×</button>
        </div>
      )}

      {selectedChild && (
        <div className="compact-table-wrapper" style={{ borderRadius: '12px', overflowX: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e2e8f0' }}>
          <table className="compact-schedule" style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
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
      )}
    </div>
  );
};

export default OrtuSchedule;
