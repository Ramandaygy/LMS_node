import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtpInfo, setDevOtpInfo] = useState('');

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setDevOtpInfo('');

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setSuccessMsg(res.data.message || 'Kode OTP telah dikirimkan ke email Anda.');
      if (res.data.dev_otp) {
        setDevOtpInfo(`Kode OTP Simulasi (Dev Mode): ${res.data.dev_otp}`);
      }
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengirimkan kode OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/auth/verify-otp', { email, otp });
      setSuccessMsg('Kode OTP valid! Silakan masukkan password baru Anda.');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Kode OTP salah atau kedaluwarsa');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      setSuccessMsg('Password berhasil diubah! Mengalihkan ke halaman login...');
      setTimeout(() => {
        navigate('/login/siswa');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mereset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Side */}
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
          <h2>Reset <span>Password</span> Akun LMS</h2>
          <p>Dapatkan akses kembali ke akun LMS SMP N 1 Suradadi Anda secara aman menggunakan verifikasi kode OTP yang dikirim ke email terdaftar.</p>

          <div className="auth-features">
            <div className="auth-feature">
              <span className="material-symbols-outlined">mark_email_read</span>
              <div>
                <h4>Verifikasi Email OTP</h4>
                <p>Kode unik 6 digit dikirim langsung ke alamat email Anda.</p>
              </div>
            </div>
            <div className="auth-feature">
              <span className="material-symbols-outlined">verified_user</span>
              <div>
                <h4>Keamanan Terjamin</h4>
                <p>Proses enkripsi aman untuk melindungi data dan akun LMS Anda.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="auth-right">
        <div className="auth-form-container">
          <div className="auth-card-modern">
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', background: '#e0f2fe', color: '#0284c7', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>
                  {step === 1 ? 'lock_reset' : step === 2 ? 'mark_email_read' : 'key'}
                </span>
              </div>
              <h3 style={{ margin: '0 0 6px 0', fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
                {step === 1 ? 'Lupa Password?' : step === 2 ? 'Verifikasi Kode OTP' : 'Buat Password Baru'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                {step === 1 ? 'Masukkan email terdaftar untuk menerima kode verifikasi' : step === 2 ? `Masukkan 6 digit kode OTP yang dikirim ke ${email}` : 'Masukkan password baru untuk akun LMS Anda'}
              </p>
            </div>

            {error && <div className="auth-error">{error}</div>}
            {successMsg && <div className="auth-error" style={{ background: '#ecfdf5', color: '#047857', borderLeftColor: '#10b981' }}>{successMsg}</div>}
            {devOtpInfo && <div className="auth-error" style={{ background: '#fef3c7', color: '#b45309', borderLeftColor: '#f59e0b', fontWeight: 600 }}>{devOtpInfo}</div>}

            {/* Step 1: Request OTP */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp}>
                <div className="auth-input-group" style={{ marginBottom: '20px' }}>
                  <label>Alamat Email Terdaftar *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">mail</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contoh: siswa@smp1suradadi.sch.id"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Kirim OTP...' : 'Kirim Kode OTP Verifikasi'}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </form>
            )}

            {/* Step 2: Input OTP */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <div className="auth-input-group" style={{ marginBottom: '20px' }}>
                  <label>Kode OTP (6 Digit) *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">pin</span>
                    <input
                      type="text"
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      style={{ letterSpacing: '6px', fontWeight: 700, fontSize: '18px' }}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Memverifikasi...' : 'Verifikasi Kode OTP'}
                  <span className="material-symbols-outlined">check_circle</span>
                </button>

                <div style={{ marginTop: '14px', textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    ← Ulangi Input Email
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 3 && (
              <form onSubmit={handleResetPassword}>
                <div className="auth-input-group" style={{ marginBottom: '16px' }}>
                  <label>Password Baru *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">lock</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="auth-input-group" style={{ marginBottom: '20px' }}>
                  <label>Konfirmasi Password Baru *</label>
                  <div className="auth-input-wrapper">
                    <span className="material-symbols-outlined">lock_reset</span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang password baru"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn" disabled={loading}>
                  {loading ? 'Mereset Password...' : 'Simpan Password Baru'}
                  <span className="material-symbols-outlined">save</span>
                </button>
              </form>
            )}

            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #f1f5f9', textAlign: 'center' }}>
              <Link to="/login/siswa" style={{ color: '#64748b', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
                Kembali ke <strong style={{ color: '#0040a1' }}>Halaman Login</strong>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
