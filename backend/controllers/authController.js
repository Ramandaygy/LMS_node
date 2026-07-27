const authService = require('../services/authService');

exports.register = async (req, res) => {
  try {
    console.log('REGISTER BODY:', req.body);

    const user = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      message: 'Register successful',
      user,
    });
  } catch (err) {
    console.log('REGISTER ERROR:', err.message);

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};

exports.me = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const result = await authService.forgotPassword(req.body.email);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const result = await authService.verifyOtp(req.body.email, req.body.otp);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const result = await authService.resetPassword(req.body.email, req.body.otp, req.body.newPassword);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};