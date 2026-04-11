// ============================================
// ADMIN ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const sms = require('../utils/sms');
const adminAuth = require('../middleware/adminAuth');
const Appointment = require('../models/Appointment');
const QueueToken = require('../models/QueueToken');
const SmsLog = require('../models/SmsLog');

// Protect all admin routes
router.use(adminAuth);

// POST: Call next person in queue
router.post('/call-next', async (req, res) => {
  try {
    const { officeId, date } = req.body;
    const now = new Date();
    const targetDate = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Mark any currently "serving" tokens as completed first
    await QueueToken.updateMany(
      { officeId, status: 'serving' },
      { status: 'completed', completedAt: new Date().toISOString() }
    );

    // Mark any "called" tokens as serving
    const calledTokens = await QueueToken.find({ officeId, status: 'called' });
    await QueueToken.updateMany(
      { officeId, status: 'called' },
      { status: 'serving' }
    );

    const nextToken = await QueueToken.findOne({
      officeId,
      status: 'waiting',
      date: targetDate,
    }).sort({ createdAt: 1 });

    if (!nextToken) {
      const io = req.app.get('io');
      if (io) io.emit('queue-updated', { officeId });
      return res.json({ message: 'No more tokens in queue', currentlyServing: calledTokens });
    }

    nextToken.status = 'called';
    nextToken.calledAt = new Date().toISOString();
    await nextToken.save();

    // Send SMS alert
    sms.sendNextInQueueAlert({ token: nextToken.token, phone: nextToken.phone });

    // Also alert the person after next
    const afterNext = await QueueToken.findOne({
      officeId,
      status: 'waiting',
      date: targetDate,
    }).sort({ createdAt: 1 });

    if (afterNext) {
      sms.sendSMS(afterNext.phone, `⏳ Heads up! You're next in line. Token: ${afterNext.token}. Please be ready.`, 'alert');
    }

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId });
    if (io) io.emit('token-called', { token: nextToken });

    res.json({ called: nextToken, message: `Token ${nextToken.token} has been called` });
  } catch (err) {
    console.error('Call next error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Mark token as completed
router.post('/complete', async (req, res) => {
  try {
    const { tokenId } = req.body;
    const token = await QueueToken.findById(tokenId);
    if (!token) return res.status(404).json({ error: 'Token not found' });

    token.status = 'completed';
    token.completedAt = new Date().toISOString();
    await token.save();

    // Also update appointment status
    await Appointment.findByIdAndUpdate(token.appointmentId, { status: 'completed' });

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId: token.officeId });

    res.json({ message: `Token ${token.token} marked as completed`, token });
  } catch (err) {
    console.error('Complete error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Skip a token
router.post('/skip', async (req, res) => {
  try {
    const { tokenId } = req.body;
    const token = await QueueToken.findById(tokenId);
    if (!token) return res.status(404).json({ error: 'Token not found' });

    token.status = 'skipped';
    await token.save();

    sms.sendSMS(token.phone, `⚠️ Your token ${token.token} was skipped. Please check with the counter.`, 'alert');

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId: token.officeId });

    res.json({ message: `Token ${token.token} skipped`, token });
  } catch (err) {
    console.error('Skip error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Re-queue a skipped token
router.post('/requeue', async (req, res) => {
  try {
    const { tokenId } = req.body;
    const token = await QueueToken.findById(tokenId);
    if (!token) return res.status(404).json({ error: 'Token not found' });

    token.status = 'waiting';
    token.createdAt = new Date(); // Move to end of queue
    await token.save();

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId: token.officeId });

    res.json({ message: `Token ${token.token} re-queued`, token });
  } catch (err) {
    console.error('Requeue error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Mark token as no-show
router.post('/no-show', async (req, res) => {
  try {
    const { tokenId } = req.body;
    const token = await QueueToken.findById(tokenId);
    if (!token) return res.status(404).json({ error: 'Token not found' });

    token.status = 'no-show';
    token.noShowAt = new Date().toISOString();
    await token.save();

    // Update linked appointment
    await Appointment.findByIdAndUpdate(token.appointmentId, { status: 'no-show' });

    sms.sendSMS(token.phone, `⚠️ Token ${token.token} marked as no-show. Please visit the counter if you are present.`, 'alert');

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId: token.officeId });

    res.json({ message: `Token ${token.token} marked as no-show`, token });
  } catch (err) {
    console.error('No-show error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST: Add walk-in user
router.post('/walk-in', async (req, res) => {
  try {
    const { name, phone, serviceId, officeId, timeSlot } = req.body;

    if (!name || !phone || !serviceId || !officeId) {
      return res.status(400).json({ error: 'name, phone, serviceId, and officeId are required' });
    }

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const assignedSlot = timeSlot || 'Walk-in';
    const token = await store.generateToken();

    const appointment = await Appointment.create({
      name,
      phone,
      serviceId,
      officeId,
      date: today,
      timeSlot: assignedSlot,
      token,
      status: 'checked-in',
      type: 'walk-in',
    });

    const queueToken = await QueueToken.create({
      token,
      appointmentId: appointment._id.toString(),
      officeId,
      serviceId,
      date: today,
      timeSlot: assignedSlot,
      status: 'waiting',
      type: 'walk-in',
      name,
      phone,
    });

    sms.sendSMS(phone, `🎫 Walk-in registered! Your token: ${token}. Please wait for your turn.`, 'confirmation');

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId });

    res.status(201).json({ appointment, queueToken });
  } catch (err) {
    console.error('Walk-in error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT: Update slot capacity
router.put('/slot-capacity', (req, res) => {
  const { capacity } = req.body;
  if (!capacity || capacity < 1) return res.status(400).json({ error: 'Capacity must be >= 1' });
  store.slotConfig.defaultCapacity = capacity;
  res.json({ message: `Slot capacity updated to ${capacity}`, slotConfig: store.slotConfig });
});

// GET: SMS log
router.get('/sms-log', async (req, res) => {
  try {
    const logs = await SmsLog.find().sort({ createdAt: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET: All appointments for admin
router.get('/appointments/all', async (req, res) => {
  try {
    const { date, officeId } = req.query;
    const filter = {};
    if (date) filter.date = date;
    if (officeId) filter.officeId = officeId;

    const appts = await Appointment.find(filter).sort({ createdAt: -1 });

    // Enrich with service/office names
    const enriched = appts.map(a => ({
      ...a.toObject(),
      id: a._id,
      serviceName: store.services.find(s => s.id === a.serviceId)?.name,
      officeName: store.offices.find(o => o.id === a.officeId)?.name,
    }));

    res.json(enriched);
  } catch (err) {
    console.error('Admin appointments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
