// ============================================
// ADMIN AUTH MIDDLEWARE
// ============================================
const store = require('../data/store');

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  const session = store.sessions.find(s => s.token === token && s.role === 'admin');
  if (!session) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const admin = store.admins.find(a => a.id === session.userId);
  if (!admin) {
    return res.status(403).json({ error: 'Admin account not found' });
  }

  req.admin = admin;
  next();
}

module.exports = adminAuth;
