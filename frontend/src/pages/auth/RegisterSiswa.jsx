import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth';
import '../../styles/auth.css';

const RegisterSiswa = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    nis: '',
    class: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const submitData = {
      ...formData,
      role: 'siswa'
    };

    try {
      await authService.register(submitData);
      navigate('/login/siswa');
    } catch (error) {
      setError(error.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Side - Welcome Message */}
      <div className="auth-left">
        <div className="auth-left-bg"></div>
        <div className="auth-left-overlay"></div>
        <div className="auth-left-content">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <span className="material-symbols-outlined">school</span>
            </div>
            <h1>SMP N 1 SURADADI</h1>
          </div>
          <h2>Start Your <span>Learning</span> Journey</h2>
          <p>Join SMP N 1 Suradadi today. Create your student account to access curated learning materials, track your progress, and achieve academic excellence.</p>
          
          <div className="auth-features">
            <div className="auth-feature">
              <span className="material-symbols-outlined">menu_book</span>
              <div>
                <h4>Curated Learning Paths</h4>
                <p>High-end editorial content tailored for the academic curriculum.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="material-symbols-outlined">monitoring</span>
              <div>
                <h4>Real-time Progress</h4>
                <p>Track your learning journey and achievements.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="auth-right">
        <div className="auth-form-container">
          {/* Mobile Branding */}
          <div className="auth-mobile-branding">
            <div className="auth-mobile-logo">
              <span className="material-symbols-outlined">school</span>
            </div>
            <h2>SMP N 1 SURADADI</h2>
            <p>Student Registration</p>
          </div>

          {/* Form Card */}
          <div className="auth-card-modern">
            {/* Tab Navigation */}
            <div className="auth-tabs">
              <Link to="/login/siswa" className="auth-tab">LOGIN</Link>
              <button className="auth-tab active">REGISTER</button>
              </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="auth-error">{error}</div>}
              
              <div className="auth-form-row">
                <div className="auth-input-group">
                  <label>Full Name *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">badge</span>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Username *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">person</span>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="Choose a username"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="auth-form-row">
                <div className="auth-input-group">
                  <label>Email Address *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">mail</span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="student@email.com"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Password *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimum 6 characters"
                      required
                    />
                    <button 
                      type="button" 
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="auth-form-row">
                <div className="auth-input-group">
                  <label>NIS (Student ID) *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">numbers</span>
                    <input
                      type="text"
                      name="nis"
                      value={formData.nis}
                      onChange={handleChange}
                      placeholder="Enter your NIS"
                      required
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label>Class *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">class</span>
                    <select
                      name="class"
                      value={formData.class}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select Class</option>
                      <option value="7A">7A</option>
                      <option value="7B">7B</option>
                      <option value="8A">8A</option>
                      <option value="8B">8B</option>
                      <option value="9A">9A</option>
                      <option value="9B">9B</option>
                    </select>
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? 'Processing...' : 'Create Account'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            {/* Login Link */}
            <div className="auth-register-prompt">
              <p>Already have an account?</p>
              <Link to="/login/siswa" className="auth-register-btn">
                <span className="material-symbols-outlined">login</span>
                Sign In to Your Account
              </Link>
            </div>
          </div>

          {/* Footer Info */}
          <div className="auth-footer-info">
            <div className="auth-footer-support">
              <span className="material-symbols-outlined">support_agent</span>
            </div>
            <span>SMP N 1 SURADADI v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterSiswa;