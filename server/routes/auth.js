// ============================================
// AUTH ROUTES – User & Admin Login / Signup
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// ── USER SIGNUP ──
router.post('/user/signup', (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (!/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Phone must be exactly 10 digits' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (store.users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const user = {
    id: store.uuidv4(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    phone,
    password: store.hashPassword(password),
    role: 'user',
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);

  // Auto-login: create session
  const sessionToken = store.generateSessionToken();
  store.sessions.push({ token: sessionToken, userId: user.id, role: 'user', createdAt: Date.now() });

  const { password: _, ...safeUser } = user;
  res.status(201).json({ user: safeUser, token: sessionToken });
});

// ── USER LOGIN ──
router.post('/user/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = store.users.find(u => u.email === email.toLowerCase().trim());
  if (!user || user.password !== store.hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const sessionToken = store.generateSessionToken();
  store.sessions.push({ token: sessionToken, userId: user.id, role: 'user', createdAt: Date.now() });

  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser, token: sessionToken });
});

// ── ADMIN SIGNUP ──
router.post('/admin/signup', (req, res) => {
  const { name, email, password, officeId } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (store.admins.find(a => a.email === email.toLowerCase().trim())) {
    return res.status(409).json({ error: 'Admin email already registered' });
  }

  const admin = {
    id: store.uuidv4(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: store.hashPassword(password),
    officeId: officeId || 'off-1',
    role: 'admin',
    createdAt: new Date().toISOString(),
  };
  store.admins.push(admin);

  const sessionToken = store.generateSessionToken();
  store.sessions.push({ token: sessionToken, userId: admin.id, role: 'admin', createdAt: Date.now() });

  const { password: _, ...safeAdmin } = admin;
  res.status(201).json({ user: safeAdmin, token: sessionToken });
});

// ── ADMIN LOGIN ──
router.post('/admin/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const admin = store.admins.find(a => a.email === email.toLowerCase().trim());
  if (!admin || admin.password !== store.hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const sessionToken = store.generateSessionToken();
  store.sessions.push({ token: sessionToken, userId: admin.id, role: 'admin', createdAt: Date.now() });

  const { password: _, ...safeAdmin } = admin;
  res.json({ user: safeAdmin, token: sessionToken });
});

// ── GET CURRENT SESSION ──
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  const session = store.sessions.find(s => s.token === token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  let account;
  if (session.role === 'admin') {
    account = store.admins.find(a => a.id === session.userId);
  } else {
    account = store.users.find(u => u.id === session.userId);
  }

  if (!account) {
    return res.status(401).json({ error: 'Account not found' });
  }

  const { password: _, ...safeAccount } = account;
  res.json({ user: safeAccount, role: session.role });
});

// ── LOGOUT ──
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const idx = store.sessions.findIndex(s => s.token === token);
    if (idx !== -1) store.sessions.splice(idx, 1);
  }
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
