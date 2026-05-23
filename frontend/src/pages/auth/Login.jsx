import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import '../../styles/auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState('siswa');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { id: 'siswa', name: 'Siswa', icon: '👨‍🎓' },
    { id: 'guru', name: 'Guru', icon: '👨‍🏫' },
    { id: 'ortu', name: 'Orang Tua', icon: '👨‍👩‍👧' },
    { id: 'admin', name: 'Admin', icon: '👨‍💼' }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.login(formData);
      const user = response.user;
      
      // Validasi role sesuai yang dipilih
      if (user.role !== selectedRole) {
        setError(`Anda login sebagai ${user.role}, bukan ${selectedRole}`);
        setLoading(false);
        return;
      }
      
      navigate(`/dashboard/${user.role}`);
    } catch (error) {
      setError(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`auth-container ${selectedRole}`}>
      <div className="auth-card">
        <div className={`auth-header ${selectedRole}`}>
          <h2>Login sebagai {roles.find(r => r.id === selectedRole)?.name}</h2>
          <p>Masuk ke akun {selectedRole} Anda</p>
        </div>
        
        {/* Role Selector */}
        <div className="role-selector">
          {roles.map(role => (
            <button
              key={role.id}
              className={`role-btn ${selectedRole === role.id ? 'active' : ''}`}
              onClick={() => setSelectedRole(role.id)}
            >
              {role.icon} {role.name}
            </button>
          ))}
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email atau Username</label>
            <input
              type="text"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Masukkan email atau username"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Masukkan password"
              required
            />
          </div>
          
          <button type="submit" disabled={loading} className={`btn-submit ${selectedRole}`}>
            {loading ? 'Memproses...' : `Login sebagai ${selectedRole}`}
          </button>
          
          <div className="auth-footer">
            Belum punya akun?{' '}
            <Link to={`/register/${selectedRole}`}>Daftar sebagai {selectedRole}</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;