const nodemailer = require('nodemailer');

// Initialize Transporter with environment variables or Ethereal/Local fallback
const createTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to dummy transport for development/testing if no SMTP provided
  return {
    sendMail: async (options) => {
      console.log('================================================');
      console.log('[DEV EMAIL SERVICE] Email Sending Simulation:');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body OTP: ${options.html}`);
      console.log('================================================');
      return { messageId: 'simulated-dev-email-id' };
    },
  };
};

const transporter = createTransporter();

exports.sendOtpEmail = async (toEmail, otpCode, fullName = 'Pengguna') => {
  const mailOptions = {
    from: `"LMS SMP N 1 Suradadi" <${process.env.SMTP_USER || 'no-reply@lmssmpn1suradadi.sch.id'}>`,
    to: toEmail,
    subject: ' Kode OTP Verifikasi Reset Password - LMS SMP N 1 Suradadi',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0040a1;">
          <h2 style="color: #0040a1; margin: 0;">LMS SMP N 1 SURADADI</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Sistem Informasi Pembelajaran & Verifikasi Keamanan</p>
        </div>

        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #1e293b;">Halo, <strong>${fullName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Kami menerima permintaan untuk mereset password akun LMS Anda. Gunakan kode verifikasi OTP di bawah ini untuk melanjutkan alur reset password:
          </p>

          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0040a1; background-color: #eff6ff; padding: 14px 32px; border-radius: 12px; border: 2px dashed #3b82f6;">
              ${otpCode}
            </div>
            <p style="font-size: 12px; color: #ef4444; margin-top: 10px;">⏰ Kode ini berlaku selama <strong>15 menit</strong>.</p>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Jika Anda tidak merasa melakukan permintaan reset password, abaikan email ini. Keamanan akun Anda tetap terjamin.
          </p>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">© ${new Date().getFullYear()} LMS SMP N 1 Suradadi. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('[EMAIL ERROR] Gagal mengirim email OTP:', error);
    throw new Error('Gagal mengirimkan email verifikasi OTP: ' + error.message);
  }
};

exports.sendCredentialsEmail = async (toEmail, username, password, fullName, role) => {
  const roleLabels = {
    admin: 'Admin TU',
    super_admin: 'Super Admin',
    wakil_kurikulum: 'Wakil Kurikulum (Waka)',
    bk: 'Guru Bimbingan Konseling (BK)',
    guru: 'Guru Mata Pelajaran',
    siswa: 'Siswa',
    ortu: 'Orang Tua / Wali'
  };
  const roleLabel = roleLabels[role] || role;

  const loginPaths = {
    siswa: '/login/siswa',
    ortu: '/login/ortu',
    guru: '/login/guru',
    bk: '/login/guru',
    wakil_kurikulum: '/login/guru',
    admin: '/login/admin',
    super_admin: '/login/admin'
  };
  const loginPath = loginPaths[role] || '/login';
  const baseUrl = process.env.FRONTEND_URL || 'https://lmssmpn1suradadi.vercel.app';
  const fullLoginUrl = `${baseUrl}${loginPath}`;

  const mailOptions = {
    from: `"LMS SMP N 1 Suradadi" <${process.env.SMTP_USER || 'no-reply@lmssmpn1suradadi.sch.id'}>`,
    to: toEmail,
    subject: '🔑 Kredensial Akun LMS SMP N 1 Suradadi Anda',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0284c7;">
          <h2 style="color: #0284c7; nodemargin: 0;">LMS SMP N 1 SURADADI</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Penyediaan Kredensial Akun Pengguna Terpusat</p>
        </div>

        <div style="padding: 24px 0;">
          <p style="font-size: 16px; color: #1e293b;">Halo Yth, <strong>${fullName}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Akun Anda pada platform LMS SMP N 1 Suradadi telah berhasil diprovisikan oleh Administrator.
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #64748b; width: 120px;">Role Akses:</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1e293b; font-weight: bold;">${roleLabel}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Username:</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1e293b; font-weight: bold; font-family: monospace;">${username}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 14px; color: #64748b;">Password:</td>
                <td style="padding: 8px 0; font-size: 14px; color: #1e293b; font-weight: bold; font-family: monospace;">${password}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            Silakan login melalui tautan di bawah ini. Demi keamanan, Anda sangat disarankan untuk langsung mengganti password Anda setelah pertama kali berhasil masuk.
          </p>

          <div style="text-align: center; margin: 24px 0;">
            <a href="${fullLoginUrl}" style="display: inline-block; background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: bold; font-size: 14px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
              Login ke LMS
            </a>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0;">© ${new Date().getFullYear()} LMS SMP N 1 Suradadi. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error('[EMAIL ERROR] Gagal mengirim email kredensial:', error);
    throw new Error('Gagal mengirimkan email kredensial: ' + error.message);
  }
};
