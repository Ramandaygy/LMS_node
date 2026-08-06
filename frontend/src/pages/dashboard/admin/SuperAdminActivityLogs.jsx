import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const SuperAdminActivityLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/activities');
      setLogs(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.detail?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || log.user_role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Title */}
      <div style={{ marginBottom: '28px' }}>
        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
          SUPER ADMINISTRATOR
        </span>
        <h2 style={{ fontSize: '26px', color: '#0f172a', fontWeight: '800', margin: '8px 0 4px 0' }}>
          Audit Activity Logs
        </h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
          Pantau seluruh aktivitas penting, mutasi data, dan proses otentikasi di dalam platform secara real-time.
        </p>
      </div>

      {/* Filter and Search */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder="Cari pelaku, aksi, atau detail log..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none', minWidth: '160px' }}
        >
          <option value="">Semua Role</option>
          <option value="super_admin">Super Admin</option>
          <option value="admin">Admin TU</option>
          <option value="wakil_kurikulum">Waka Kurikulum</option>
          <option value="guru">Guru</option>
          <option value="siswa">Siswa</option>
          <option value="ortu">Orang Tua</option>
        </select>
        <button onClick={fetchLogs} style={{ background: '#f1f5f9', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>refresh</span>
          Segarkan
        </button>
      </div>

      {/* Logs Card List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            Memuat aktivitas log...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#64748b' }}>
            Tidak ada log aktivitas terekam.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log._id || log.id} style={{ background: '#ffffff', borderRadius: '16px', padding: '18px 24px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Action Icon representation */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: log.action?.includes('RESTORE') || log.action?.includes('CREATE') ? '#ecfdf5' : '#f8fafc', color: log.action?.includes('RESTORE') || log.action?.includes('CREATE') ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                    {log.action?.includes('RESTORE') ? 'restore' : log.action?.includes('LOGIN') ? 'login' : 'history'}
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#0f172a' }}>{log.user_name}</strong>
                    <span style={{ fontSize: '10px', fontWeight: '800', background: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '12px', textTransform: 'uppercase' }}>
                      {log.user_role}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
                    <span style={{ fontWeight: '700', color: '#0284c7' }}>{log.action}</span> - {log.detail}
                  </div>
                </div>
              </div>

              {/* Timestamp */}
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', whiteSpace: 'nowrap' }}>
                {new Date(log.created_at || log.createdAt || Date.now()).toLocaleString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default SuperAdminActivityLogs;
