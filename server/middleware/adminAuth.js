// ============================================
// ADMIN AUTH MIDDLEWARE
// ============================================
const Session = require('../models/Session');
const Admin = require('../models/Admin');

async function adminAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const session = await Session.findOne({ token, role: 'admin' });
    if (!session) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const admin = await Admin.findById(session.userId);
    if (!admin) {
      return res.status(403).json({ error: 'Admin account not found' });
    }

    req.admin = admin;
    next();
  } catch (err) {
    console.error('Admin auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = adminAuth;
