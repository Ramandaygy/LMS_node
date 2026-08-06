import React, { useState, useEffect } from 'react';
import api from '../../../services/api';

const SuperAdminAccounts = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    username: '',
    password: '',
    role: 'guru',
    is_active: true,
    nis: '',
    nip: '',
    nik: '',
    phone: '',
  });

  const [classes, setClasses] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [modalErrorMsg, setModalErrorMsg] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchClasses();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memuat daftar akun.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormData({
      ...formData,
      role,
      nis: '',
      nip: '',
      nik: '',
    });
  };

  // Helper to validate input lengths
  const validateForm = () => {
    setModalErrorMsg('');
    if (formData.phone && !/^\d{10,13}$/.test(formData.phone)) {
      setModalErrorMsg('No HP harus berupa angka sepanjang 10 sampai 13 digit!');
      return false;
    }

    if (formData.role === 'siswa') {
      if (!formData.nis || !/^\d{4,10}$/.test(formData.nis)) {
        setModalErrorMsg('NIS harus berupa angka sepanjang 4 sampai 10 digit!');
        return false;
      }
    } else if (formData.role === 'ortu') {
      if (!formData.nik || !/^\d{16}$/.test(formData.nik)) {
        setModalErrorMsg('NIK harus berupa angka sepanjang 16 digit!');
        return false;
      }
    } else if (['guru', 'bk', 'wakil_kurikulum'].includes(formData.role)) {
      if (formData.nip && !/^\d{9,18}$/.test(formData.nip)) {
        setModalErrorMsg('NIP harus berupa angka sepanjang 9 sampai 18 digit!');
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setModalErrorMsg('');

    if (!validateForm()) return;

    try {
      if (editingUser) {
        // Update user
        const updatePayload = { ...formData };
        delete updatePayload.password; // Do not update password here
        await api.put(`/users/${editingUser._id || editingUser.id}`, updatePayload);
        setSuccessMsg('Akun berhasil diperbarui!');
      } else {
        // Create user
        await api.post('/users', formData);
        setSuccessMsg('Akun baru berhasil dibuat (diprovisikan)!');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setModalErrorMsg(err.response?.data?.message || 'Gagal menyimpan akun.');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      username: user.username || '',
      role: user.role || 'guru',
      is_active: user.is_active !== undefined ? user.is_active : true,
      nis: user.nis || '',
      nip: user.nip || '',
      nik: user.nik || '',
      phone: user.phone || '',
    });
    setModalErrorMsg('');
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun ${user.full_name}?`)) {
      try {
        await api.delete(`/users/${user._id || user.id}`);
        setSuccessMsg('Akun berhasil dihapus.');
        fetchUsers();
      } catch (err) {
        setErrorMsg('Gagal menghapus akun.');
      }
    }
  };

  const handleResetPassword = async (user) => {
    const newPass = prompt(`Masukkan password baru untuk ${user.full_name}:`, 'smp12345');
    if (newPass) {
      try {
        await api.put(`/users/${user._id || user.id}`, { password: newPass });
        alert(`Password untuk ${user.full_name} berhasil diubah menjadi: ${newPass}`);
      } catch (err) {
        alert('Gagal mereset password.');
      }
    }
  };

  const handleSendEmailSingle = async (user) => {
    if (!user.email) {
      alert('Pengguna tidak memiliki email terdaftar!');
      return;
    }
    if (!window.confirm(`Kirim email kredensial baru ke ${user.full_name} (${user.email})? Tindakan ini akan meng-generate password baru.`)) {
      return;
    }

    setEmailLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.post(`/users/${user._id || user.id}/send-email`);
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Email kredensial berhasil dikirim!');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Gagal mengirim email.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendEmailAll = async () => {
    const activeWithEmails = users.filter(u => u.role !== 'super_admin' && u.email);
    if (activeWithEmails.length === 0) {
      alert('Tidak ada pengguna dengan email yang terdaftar!');
      return;
    }

    if (!window.confirm(`PERINGATAN: Kirim email kredensial ke SELURUH ${activeWithEmails.length} pengguna? Setiap pengguna akan mendapatkan password baru yang di-generate sistem.`)) {
      return;
    }

    setEmailLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await api.post('/users/send-email-all');
      if (res.data.success) {
        setSuccessMsg(res.data.message || 'Semua email kredensial berhasil dikirim!');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Gagal mengirim email massal.');
    } finally {
      setEmailLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}>
            SUPER ADMINISTRATOR
          </span>
          <h2 style={{ fontSize: '26px', color: '#0f172a', fontWeight: '800', margin: '8px 0 0 0' }}>
            Penyediaan Akun Terpusat (Provisioning)
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleSendEmailAll}
            disabled={emailLoading}
            style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '12px 20px', borderRadius: '14px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
          >
            <span className="material-symbols-outlined">alternate_email</span>
            {emailLoading ? 'Mengirim...' : 'Kirim Email Massal'}
          </button>
          <button
            onClick={() => {
              setEditingUser(null);
              setFormData({
                full_name: '',
                email: '',
                username: '',
                password: '',
                role: 'guru',
                is_active: true,
                nis: '',
                nip: '',
                nik: '',
                phone: '',
              });
              setModalErrorMsg('');
              setShowModal(true);
            }}
            style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', padding: '12px 24px', borderRadius: '14px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.2)' }}
          >
            <span className="material-symbols-outlined">person_add</span>
            Provisikan Akun Baru
          </button>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '12px 16px', borderRadius: '12px', border: '1px solid #bbf7d0', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
          ✔ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: '12px', border: '1px solid #fecaca', fontSize: '14px', fontWeight: '600', marginBottom: '20px' }}>
          ✖ {errorMsg}
        </div>
      )}

      {/* Filter and Search */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', background: '#fff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
        <input
          type="text"
          placeholder="Cari nama, username, atau email..."
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
          <option value="bk">Guru BK</option>
          <option value="guru">Guru Mapel</option>
          <option value="siswa">Siswa</option>
          <option value="ortu">Orang Tua</option>
        </select>
      </div>

      {/* Users Table */}
      <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Nama</th>
              <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Role</th>
              <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Username / Email</th>
              <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Identitas</th>
              <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '700', color: '#64748b' }}>Status</th>
              <th style={{ padding: '16px 24px', fontSize: '13px', fontWeight: '700', color: '#64748b', textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Memuat data akun...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Tidak ada akun ditemukan.</td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user._id || user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a' }}>{user.full_name}</div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '30px', textTransform: 'uppercase', background: user.role === 'super_admin' ? '#fee2e2' : user.role === 'admin' ? '#eff6ff' : '#f1f5f9', color: user.role === 'super_admin' ? '#ef4444' : user.role === 'admin' ? '#3b82f6' : '#475569' }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: '14px', color: '#0f172a' }}>{user.username}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{user.email}</div>
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '13px', color: '#475569' }}>
                    {user.nis && <div>NIS: {user.nis}</div>}
                    {user.nip && <div>NIP: {user.nip}</div>}
                    {user.nik && <div>NIK: {user.nik}</div>}
                    {user.phone && <div>HP: {user.phone}</div>}
                    {!user.nis && !user.nip && !user.nik && !user.phone && <span>-</span>}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: user.is_active ? '#16a34a' : '#94a3b8' }}>
                      {user.is_active ? '● Aktif' : '● Nonaktif'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {user.role !== 'super_admin' && (
                        <button onClick={() => handleSendEmailSingle(user)} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} title="Kirim Email Kredensial">
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>mail</span>
                          Kirim Email
                        </button>
                      )}
                      <button onClick={() => handleResetPassword(user)} style={{ background: '#f1f5f9', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#475569', cursor: 'pointer' }} title="Reset Password">
                        Key
                      </button>
                      <button onClick={() => handleEdit(user)} style={{ background: '#eff6ff', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#0284c7', cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(user)} style={{ background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: '#ef4444', cursor: 'pointer' }}>
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '24px', width: '500px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: '0 0 20px 0' }}>
              {editingUser ? 'Edit Akun Pengguna' : 'Provisikan Akun Baru'}
            </h3>
            
            {modalErrorMsg && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: '10px', border: '1px solid #fecaca', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
                ✖ {modalErrorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Nama Lengkap</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Username</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} required style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Role</label>
                  <select name="role" value={formData.role} onChange={handleRoleChange} disabled={!!editingUser} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#fff', outline: 'none' }}>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin TU</option>
                    <option value="wakil_kurikulum">Waka Kurikulum</option>
                    <option value="bk">Guru BK</option>
                    <option value="guru">Guru Mapel</option>
                    <option value="siswa">Siswa</option>
                    <option value="ortu">Orang Tua</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              {!editingUser && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Password Awal</label>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} required style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              )}

              {/* Role-Specific Identitas Inputs */}
              {formData.role === 'siswa' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>NIS (4-10 Digit Angka)</label>
                  <input type="text" name="nis" value={formData.nis} onChange={handleChange} required style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              )}

              {formData.role === 'ortu' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>NIK (16 Digit Angka)</label>
                  <input type="text" name="nik" value={formData.nik} onChange={handleChange} required style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              )}

              {['guru', 'bk', 'wakil_kurikulum'].includes(formData.role) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>NIP (9-18 Digit Angka, Opsional)</label>
                  <input type="text" name="nip" value={formData.nip} onChange={handleChange} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>No HP (10-13 Digit, Opsional)</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
                <input type="checkbox" name="is_active" id="is_active" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                <label htmlFor="is_active" style={{ fontSize: '13px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>Aktifkan Akun</label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>
                  Batal
                </button>
                <button type="submit" style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer' }}>
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminAccounts;
