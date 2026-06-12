import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { authService } from '../../../services/auth';
import '../../../styles/dashboard/shared/calendar-info.css';

const CalendarInfo = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const currentUser = authService.getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: '',
    type: 'academic',
    color: '#0040a1'
  });

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data);
    } catch (err) {
      console.error('Failed to fetch events', err);
      setError('Gagal memuat kalender info');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await api.put(`/events/${editingEvent._id}`, formData);
      } else {
        await api.post('/events', formData);
      }
      setShowModal(false);
      setEditingEvent(null);
      setFormData({ title: '', description: '', start_date: '', end_date: '', type: 'academic', color: '#0040a1' });
      fetchEvents();
    } catch (err) {
      alert('Gagal menyimpan event');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      start_date: event.start_date.split('T')[0],
      end_date: event.end_date.split('T')[0],
      type: event.type || 'academic',
      color: event.color || '#0040a1'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus agenda ini?')) {
      try {
        await api.delete(`/events/${id}`);
        fetchEvents();
      } catch (err) {
        alert('Gagal menghapus event');
      }
    }
  };

  // Calendar logic
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = currentDate.toLocaleString('id-ID', { month: 'long' });

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const dayEvents = events.filter(e => {
        const start = e.start_date.split('T')[0];
        const end = e.end_date.split('T')[0];
        return dateStr >= start && dateStr <= end;
      });

      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <div key={d} className={`calendar-day ${isToday ? 'today' : ''}`}>
          <div className="day-number">{d}</div>
          <div className="day-events">
            {dayEvents.map(ev => (
              <div 
                key={ev._id} 
                className="event-chip" 
                style={{ backgroundColor: ev.color }}
                onClick={() => isAdmin && handleEdit(ev)}
                title={ev.title}
              >
                {ev.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="calendar-wrapper">
        <div className="calendar-header">
          <button onClick={prevMonth}>&lt;</button>
          <h3>{monthName} {year}</h3>
          <button onClick={nextMonth}>&gt;</button>
        </div>
        <div className="calendar-grid">
          {['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (
            <div key={day} className="calendar-weekday">{day}</div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const renderEventList = () => {
    // Tampilkan event terdekat dari hari ini
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = events.filter(e => e.end_date.split('T')[0] >= todayStr).slice(0, 5);

    return (
      <div className="event-list-sidebar">
        <h3>Agenda Mendatang</h3>
        {upcoming.length === 0 ? (
          <p className="no-events">Tidak ada agenda terdekat.</p>
        ) : (
          <div className="upcoming-events">
            {upcoming.map(ev => (
              <div key={ev._id} className="upcoming-card" style={{ borderLeftColor: ev.color }}>
                <div className="upcoming-date">
                  {new Date(ev.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                  {ev.start_date.split('T')[0] !== ev.end_date.split('T')[0] && 
                    ` - ${new Date(ev.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                  }
                </div>
                <div className="upcoming-title">{ev.title}</div>
                {ev.description && <div className="upcoming-desc">{ev.description}</div>}
                
                {isAdmin && (
                  <div className="upcoming-actions">
                    <button onClick={() => handleEdit(ev)} className="btn-edit-small">Edit</button>
                    <button onClick={() => handleDelete(ev._id)} className="btn-del-small">Hapus</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="calendar-loading">Memuat kalender...</div>;

  return (
    <div className="calendar-container">
      <div className="page-header">
        <div>
          <h2>Kalender Info</h2>
          <p>Informasi jadwal dan kegiatan akademik sekolah</p>
        </div>
        {isAdmin && (
          <button className="btn-add-event" onClick={() => { setEditingEvent(null); setFormData({ title: '', description: '', start_date: '', end_date: '', type: 'academic', color: '#0040a1' }); setShowModal(true); }}>
            + Tambah Agenda
          </button>
        )}
      </div>

      {error && <div className="alert-error">{error}</div>}

      <div className="calendar-layout">
        <div className="calendar-main">
          {renderCalendar()}
        </div>
        <div className="calendar-sidebar">
          {renderEventList()}
        </div>
      </div>

      {showModal && isAdmin && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>{editingEvent ? 'Edit Agenda' : 'Tambah Agenda Baru'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Judul Agenda</label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Deskripsi (Opsional)</label>
                <textarea name="description" value={formData.description} onChange={handleChange}></textarea>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tanggal Mulai</label>
                  <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Tanggal Selesai</label>
                  <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Warna Label</label>
                  <input type="color" name="color" value={formData.color} onChange={handleChange} />
                </div>
              </div>
              <div className="modal-buttons">
                <button type="button" onClick={() => setShowModal(false)} className="btn-cancel">Batal</button>
                <button type="submit" className="btn-submit">Simpan Agenda</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarInfo;
