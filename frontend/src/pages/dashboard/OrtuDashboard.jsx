import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import '../../styles/dashboard/ortu/ortu.css';

const OrtuDashboard = () => {
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState({});
  const [children, setChildren] = useState([]);

  const [stats, setStats] = useState({
    total_children: 0,
    average_progress: 0,
    total_materials: 0,
    completed_tasks: 0,
  });

  const [todaySchedule, setTodaySchedule] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [
        profileRes,
        statsRes,
        progressRes,
        scheduleRes,
        submissionRes
      ] = await Promise.allSettled([
        api.get('/profile'),
        api.get('/dashboard/stats'),
        api.get('/progress'),
        api.get('/schedules'),
        api.get('/submissions')
      ]);

      if (profileRes.status === 'fulfilled') {
        setProfile(profileRes.value.data);
      }

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data);
      }

      if (progressRes.status === 'fulfilled') {
        setChildren(progressRes.value.data || []);
      }

      if (scheduleRes.status === 'fulfilled') {
        setTodaySchedule(scheduleRes.value.data || []);
      }

      if (submissionRes.status === 'fulfilled') {
        setRecentTasks(submissionRes.value.data || []);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ortu-loading">
        Memuat Dashboard...
      </div>
    );
  }

  return (
    <div className="ortu-dashboard">

      {/* Header */}

      <div className="ortu-header">
        <h2>
          Halo, {profile.full_name}
        </h2>

        <p>
          Pantau perkembangan belajar anak Anda
        </p>
      </div>

      {/* Stats */}

      <div className="stats-grid">

        <div className="stat-card">
          <span>👨‍👩‍👧</span>
          <h3>{stats.total_children || 0}</h3>
          <p>Anak Terdaftar</p>
        </div>

        <div className="stat-card">
          <span>📚</span>
          <h3>{stats.total_materials || 0}</h3>
          <p>Materi Selesai</p>
        </div>

        <div className="stat-card">
          <span>📝</span>
          <h3>{stats.completed_tasks || 0}</h3>
          <p>Tugas Selesai</p>
        </div>

        <div className="stat-card">
          <span>📈</span>
          <h3>{stats.average_progress || 0}%</h3>
          <p>Progress Belajar</p>
        </div>

      </div>

      {/* Anak */}

      <div className="card-section">

        <h3>Anak Terhubung</h3>

        {children.length === 0 ? (
          <p>Belum ada data anak.</p>
        ) : (
          children.map((child) => (
            <div
              key={child._id}
              className="child-card"
            >
              <div className="child-top">
                <h4>{child.full_name}</h4>
                <span>{child.class_name}</span>
              </div>

              <div className="progress-wrapper">

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${child.progress || 0}%`
                    }}
                  />
                </div>

                <p>
                  Progress {child.progress || 0}%
                </p>

              </div>

            </div>
          ))
        )}
      </div>

      {/* Jadwal */}

      <div className="card-section">

        <h3>Jadwal Hari Ini</h3>

        {todaySchedule.length === 0 ? (
          <p>Tidak ada jadwal.</p>
        ) : (
          todaySchedule.map((item) => (
            <div
              key={item._id}
              className="schedule-item"
            >
              <div>

                <strong>
                  {item.subject_name}
                </strong>

                <p>
                  {item.start_time}
                  {' - '}
                  {item.end_time}
                </p>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Tugas */}

      <div className="card-section">

        <h3>Tugas Terbaru</h3>

        {recentTasks.length === 0 ? (
          <p>Tidak ada tugas.</p>
        ) : (
          recentTasks.slice(0, 5).map((task) => (
            <div
              key={task._id}
              className="task-item"
            >
              <strong>
                {task.title}
              </strong>

              <span>
                {task.status}
              </span>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default OrtuDashboard;