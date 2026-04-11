// ============================================
// AUTH ROUTES – User & Admin Login / Signup
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Session = require('../models/Session');

// ── USER SIGNUP ──
router.post('/user/signup', async (req, res) => {
  try {
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

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone,
      password: store.hashPassword(password),
      role: 'user',
    });

    // Auto-login: create session
    const sessionToken = store.generateSessionToken();
    await Session.create({ token: sessionToken, userId: user._id.toString(), role: 'user' });

    const safeUser = { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt };
    res.status(201).json({ user: safeUser, token: sessionToken });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── USER LOGIN ──
router.post('/user/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.password !== store.hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionToken = store.generateSessionToken();
    await Session.create({ token: sessionToken, userId: user._id.toString(), role: 'user' });

    const safeUser = { id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, createdAt: user.createdAt };
    res.json({ user: safeUser, token: sessionToken });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ADMIN SIGNUP ──
router.post('/admin/signup', async (req, res) => {
  try {
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

    const existing = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: 'Admin email already registered' });
    }

    const admin = await Admin.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: store.hashPassword(password),
      officeId: officeId || 'off-1',
      role: 'admin',
    });

    const sessionToken = store.generateSessionToken();
    await Session.create({ token: sessionToken, userId: admin._id.toString(), role: 'admin' });

    const safeAdmin = { id: admin._id, name: admin.name, email: admin.email, officeId: admin.officeId, role: admin.role, createdAt: admin.createdAt };
    res.status(201).json({ user: safeAdmin, token: sessionToken });
  } catch (err) {
    console.error('Admin signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── ADMIN LOGIN ──
router.post('/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin || admin.password !== store.hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const sessionToken = store.generateSessionToken();
    await Session.create({ token: sessionToken, userId: admin._id.toString(), role: 'admin' });

    const safeAdmin = { id: admin._id, name: admin.name, email: admin.email, officeId: admin.officeId, role: admin.role, createdAt: admin.createdAt };
    res.json({ user: safeAdmin, token: sessionToken });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET CURRENT SESSION ──
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = authHeader.split(' ')[1];
    const session = await Session.findOne({ token });
    if (!session) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    let account;
    if (session.role === 'admin') {
      account = await Admin.findById(session.userId);
    } else {
      account = await User.findById(session.userId);
    }

    if (!account) {
      return res.status(401).json({ error: 'Account not found' });
    }

    const safeAccount = {
      id: account._id,
      name: account.name,
      email: account.email,
      phone: account.phone,
      officeId: account.officeId,
      role: session.role,
      createdAt: account.createdAt,
    };
    res.json({ user: safeAccount, role: session.role });
  } catch (err) {
    console.error('Session check error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── LOGOUT ──
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await Session.deleteOne({ token });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
