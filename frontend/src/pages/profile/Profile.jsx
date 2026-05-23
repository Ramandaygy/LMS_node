import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { profileService } from '../../services/profile';
import '../../styles/profile/profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
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
      setUser(data);
      setFormData({
        full_name: data.full_name || '',
        bio: data.profile?.bio || '',
        phone: data.profile?.phone || '',
        address: data.profile?.address || '',
        class: data.class || '',
        subjects: data.subjects?.join(', ') || ''
      });
      setAvatarPreview(data.profile?.avatar || null);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Gagal memuat data profil');
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
      
      if (user.role === 'siswa') {
        updateData.class = formData.class;
      } else if (user.role === 'guru') {
        updateData.subjects = formData.subjects.split(',').map(s => s.trim());
      }
      
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
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    try {
      await profileService.uploadAvatar(file);
      setSuccess('Foto profil berhasil diupload');
    } catch (error) {
      setError('Gagal upload foto profil');
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      guru: 'Guru',
      siswa: 'Siswa',
      ortu: 'Orang Tua'
    };
    return labels[role] || role;
  };

  if (loading && !user) {
    return <div className="profile-loading">Memuat profil...</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">Profil Saya</h1>
        <p className="profile-subtitle">Kelola informasi akun Anda</p>
      </div>

      <div className="profile-content">
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
              <span className={`role-badge ${user?.role}`}>
                {getRoleLabel(user?.role)}
              </span>
            </span>
          </div>
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
                <span className="info-value">{user?.nis}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Kelas</span>
                <span className="info-value">{user?.class || '-'}</span>
              </div>
            </>
          )}
          
          {user?.role === 'guru' && (
            <>
              <div className="info-row">
                <span className="info-label">NIP</span>
                <span className="info-value">{user?.nip}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Mata Pelajaran</span>
                <span className="info-value">{user?.subjects?.join(', ') || '-'}</span>
              </div>
            </>
          )}
          
          {user?.role === 'ortu' && (
            <>
              <div className="info-row">
                <span className="info-label">NIK</span>
                <span className="info-value">{user?.nik}</span>
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

        {/* Action Buttons */}
        <div className="profile-actions">
          {!isEditing && !isChangingPassword && (
            <>
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <span className="material-symbols-outlined">edit</span>
                Edit Profil
              </button>
              <button className="btn-password" onClick={() => setIsChangingPassword(true)}>
                <span className="material-symbols-outlined">lock</span>
                Ganti Password
              </button>
            </>
          )}
        </div>

        {/* Edit Profile Form */}
        {isEditing && (
          <div className="profile-form-card">
            <h3>Edit Profil</h3>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Tentang Anda..."
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nomor Telepon</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>Alamat</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {user?.role === 'siswa' && (
                <div className="form-group">
                  <label>Kelas</label>
                  <select name="class" value={formData.class} onChange={handleChange}>
                    <option value="">Pilih Kelas</option>
                    <option value="7A">7A</option>
                    <option value="7B">7B</option>
                    <option value="8A">8A</option>
                    <option value="8B">8B</option>
                    <option value="9A">9A</option>
                    <option value="9B">9B</option>
                  </select>
                </div>
              )}

              {user?.role === 'guru' && (
                <div className="form-group">
                  <label>Mata Pelajaran (pisahkan dengan koma)</label>
                  <input
                    type="text"
                    name="subjects"
                    value={formData.subjects}
                    onChange={handleChange}
                    placeholder="Matematika, IPA, Bahasa Inggris"
                  />
                </div>
              )}

              <div className="form-buttons">
                <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Change Password Form */}
        {isChangingPassword && (
          <div className="profile-form-card">
            <h3>Ganti Password</h3>
            {error && <div className="alert error">{error}</div>}
            {success && <div className="alert success">{success}</div>}
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Password Lama</label>
                <input
                  type="password"
                  name="old_password"
                  value={passwordData.old_password}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password Baru</label>
                <input
                  type="password"
                  name="new_password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Konfirmasi Password Baru</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  required
                />
              </div>
              <div className="form-buttons">
                <button type="button" className="btn-cancel" onClick={() => setIsChangingPassword(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-save" disabled={loading}>
                  {loading ? 'Memproses...' : 'Ganti Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;