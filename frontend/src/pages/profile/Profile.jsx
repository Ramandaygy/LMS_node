import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profile';
import { pushNotificationService } from '../../services/pushNotificationService';
import api from '../../services/api';
import '../../styles/profile/profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [homeroomClass, setHomeroomClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const data = await profileService.getProfile();
      console.log('Profile data received:', data); // Debug
      setUser(data);
      setFormData({
        full_name: data.full_name || '',
        bio: data.profile?.bio || '',
        phone: data.profile?.phone || '',
        address: data.profile?.address || ''
      });
      setAvatarPreview(data.profileImage || null);

      if (data.role === 'guru') {
        try {
          const hrRes = await api.get('/guru/homeroom-status');
          if (hrRes.data.success && hrRes.data.is_homeroom) {
            setHomeroomClass(hrRes.data.homeroom_class);
          }
        } catch (e) {
          console.error('Failed to load homeroom status:', e);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Gagal memuat data profil: ' + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const updateData = {
        full_name: formData.full_name,
        bio: formData.bio,
        phone: formData.phone,
        address: formData.address
      };
      await profileService.updateProfile(updateData);
      setSuccess('Profil berhasil diupdate');
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal update profil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Password baru tidak cocok');
      setLoading(false);
      return;
    }
    if (passwordData.new_password.length < 6) {
      setError('Password minimal 6 karakter');
      setLoading(false);
      return;
    }
    try {
      await profileService.changePassword(passwordData.old_password, passwordData.new_password);
      setSuccess('Password berhasil diubah');
      setIsChangingPassword(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      setError(error.response?.data?.error || 'Gagal mengubah password');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
    try {
      await profileService.uploadAvatar(file);
      setSuccess('Foto profil berhasil diupload');
      fetchProfile();
    } catch (error) {
      setError('Gagal upload foto profil');
    }
  };

  const handleSubscribeNotification = async () => {
    setError('');
    setSuccess('');
    try {
      const successSub = await pushNotificationService.subscribe();
      if (successSub) {
        setSuccess('Notifikasi berhasil diaktifkan untuk perangkat ini! Silakan coba kirim test notifikasi sekarang.');
      } else {
        setError('Gagal mengaktifkan notifikasi. Browser/perangkat Anda mungkin tidak mendukung Push Notification, atau izin diblokir. Gunakan Google Chrome / Firefox versi terbaru (disarankan melalui Komputer/Laptop).');
      }
    } catch (err) {
      console.error('SUBSCRIBE ERROR:', err);
      setError('Terjadi kesalahan saat mengaktifkan notifikasi.');
    }
  };

  const handleTestNotification = async () => {
    setError('');
    setSuccess('');
    try {
      await pushNotificationService.sendTestNotification();
      setSuccess('Test Notifikasi berhasil dikirim. Silakan cek layar HP/komputer Anda!');
    } catch (error) {
      console.error('TEST NOTIFICATION ERROR:', error);
      if (error.response?.status === 404) {
        setError('Perangkat Anda belum terdaftar. Silakan klik tombol "Aktifkan Notifikasi" terlebih dahulu.');
      } else {
        setError('Gagal mengirim test notifikasi. Pastikan Anda sudah mengizinkan notifikasi di pengaturan browser Anda.');
      }
    }
  };

  const getRoleLabel = (role) => {
    const labels = { admin: 'Administrator', guru: 'Guru', siswa: 'Siswa', ortu: 'Orang Tua' };
    return labels[role] || role;
  };

  // Helper untuk mengambil nama mata pelajaran (populated)
  const getSubjectsNames = () => {
    if (!user?.subjects) return '-';
    if (Array.isArray(user.subjects)) {
      return user.subjects.map(s => s.name || s).join(', ');
    }
    return '-';
  };

  const getClassesNames = () => {
    if (!user?.classes) return '-';
    if (Array.isArray(user.classes)) {
      return user.classes.map(c => c.name || c).join(', ');
    }
    return '-';
  };

  const getStudentClass = () => {
    if (!user?.class_id) return '-';
    return user.class_id.name || user.class_id;
  };

  if (loading && !user) return <div className="profile-loading">Memuat profil...</div>;

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">Profil Saya</h1>
        <p className="profile-subtitle">Kelola informasi akun Anda</p>
      </div>

      <div className="profile-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {error && <div className="alert error" style={{ width: '100%', marginBottom: '10px' }}>{error}</div>}
        {success && <div className="alert success" style={{ width: '100%', marginBottom: '10px' }}>{success}</div>}
        
        {/* Avatar Section */}
        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
            )}
          </div>
          <label className="avatar-upload-btn">
            <span className="material-symbols-outlined">upload</span>
            Ganti Foto
            <input type="file" accept="image/*" onChange={handleAvatarUpload} hidden />
          </label>
        </div>

        {/* Profile Info */}
        <div className="profile-info-section">
          <div className="info-row">
            <span className="info-label">Role</span>
            <span className="info-value">
              <span className={`role-badge ${user?.role}`}>{getRoleLabel(user?.role)}</span>
            </span>
          </div>

          {homeroomClass && (
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1.5px solid #bae6fd',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '16px 0',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status Penugasan</div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: '#0c4a6e', marginTop: '2px' }}>Wali Kelas ({homeroomClass.name})</div>
              </div>
              <button
                onClick={() => navigate('/dashboard/guru/walikelas')}
                style={{
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '30px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>shield_person</span>
                Masuk Dashboard Wali Kelas ({homeroomClass.name})
              </button>
            </div>
          )}
          <div className="info-row">
            <span className="info-label">Email</span>
            <span className="info-value">{user?.email}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Username</span>
            <span className="info-value">{user?.username}</span>
          </div>

          {user?.role === 'siswa' && (
            <>
              <div className="info-row">
                <span className="info-label">NIS</span>
                <span className="info-value">{user?.nis || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Kelas</span>
                <span className="info-value">{getStudentClass()}</span>
              </div>
            </>
          )}

          {user?.role === 'guru' && (
            <>
              <div className="info-row">
                <span className="info-label">NIP</span>
                <span className="info-value">{user?.nip || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Mata Pelajaran</span>
                <span className="info-value">{getSubjectsNames()}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Kelas Diampu</span>
                <span className="info-value">{getClassesNames()}</span>
              </div>
            </>
          )}

          {user?.role === 'ortu' && (
            <>
              <div className="info-row">
                <span className="info-label">NIK</span>
                <span className="info-value">{user?.nik || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Nomor Telepon</span>
                <span className="info-value">{user?.profile?.phone || '-'}</span>
              </div>
            </>
          )}

          <div className="info-row">
            <span className="info-label">Bio</span>
            <span className="info-value">{user?.profile?.bio || '-'}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Alamat</span>
            <span className="info-value">{user?.profile?.address || '-'}</span>
          </div>
        </div>

        <div className="profile-actions">
          {!isEditing && !isChangingPassword && (
            <>
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                Edit Profil
              </button>
              <button className="btn-password" onClick={() => setIsChangingPassword(true)}>
                Ganti Password
              </button>
              <button className="btn-password" onClick={handleTestNotification} style={{background: '#28a745'}}>
                Test Notifikasi Asli
              </button>
            </>
          )}
        </div>

        {isEditing && (
          <div className="profile-form-card">
            <h3>Edit Profil</h3>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea name="bio" value={formData.bio} onChange={handleChange} rows="3" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nomor Telepon</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>Alamat</label>
                  <input type="text" name="address" value={formData.address} onChange={handleChange} />
                </div>
              </div>
              <div className="form-buttons">
                <button type="button" onClick={() => setIsEditing(false)}>Batal</button>
                <button type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
              </div>
            </form>
          </div>
        )}

        {isChangingPassword && (
          <div className="profile-form-card">
            <h3>Ganti Password</h3>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Password Lama</label>
                <input type="password" name="old_password" value={passwordData.old_password} onChange={handlePasswordChange} required />
              </div>
              <div className="form-group">
                <label>Password Baru</label>
                <input type="password" name="new_password" value={passwordData.new_password} onChange={handlePasswordChange} required />
              </div>
              <div className="form-group">
                <label>Konfirmasi Password Baru</label>
                <input type="password" name="confirm_password" value={passwordData.confirm_password} onChange={handlePasswordChange} required />
              </div>
              <div className="form-buttons">
                <button type="button" onClick={() => setIsChangingPassword(false)}>Batal</button>
                <button type="submit" disabled={loading}>{loading ? 'Memproses...' : 'Ganti Password'}</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;