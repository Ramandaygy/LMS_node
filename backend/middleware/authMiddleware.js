const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // Ambil token dari header 'x-auth-token'
  const token = req.header('x-auth-token');
  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Kita simpan user di req.user (sesuai payload yang kita buat di generateToken)
    req.user = decoded.user; // { id, email, username, role }
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};