// ============================================
// ADMIN ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const sms = require('../utils/sms');
const adminAuth = require('../middleware/adminAuth');

// Protect all admin routes
router.use(adminAuth);

// POST: Call next person in queue
router.post('/call-next', (req, res) => {
  const { officeId, date } = req.body;
  const now = new Date();
  const targetDate = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  // Mark any currently "serving" tokens as completed first
  store.queueTokens
    .filter(t => t.officeId === officeId && t.status === 'serving')
    .forEach(t => { t.status = 'completed'; });

  // Mark any "called" tokens as serving
  const calledTokens = store.queueTokens.filter(t => t.officeId === officeId && t.status === 'called');
  calledTokens.forEach(t => { t.status = 'serving'; });

  const nextToken = store.queueTokens
    .filter(t => t.officeId === officeId && t.status === 'waiting' && t.date === targetDate)
    .sort((a, b) => a.createdAt - b.createdAt)[0];

  if (!nextToken) {
    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId });
    return res.json({ message: 'No more tokens in queue', currentlyServing: calledTokens });
  }

  nextToken.status = 'called';
  nextToken.calledAt = new Date().toISOString();

  // Send SMS alert
  sms.sendNextInQueueAlert({ token: nextToken.token, phone: nextToken.phone });

  // Also alert the person after next
  const afterNext = store.queueTokens
    .filter(t => t.officeId === officeId && t.status === 'waiting' && t.date === targetDate)
    .sort((a, b) => a.createdAt - b.createdAt)[0];

  if (afterNext) {
    sms.sendSMS(afterNext.phone, `⏳ Heads up! You're next in line. Token: ${afterNext.token}. Please be ready.`, 'alert');
  }

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId });
  if (io) io.emit('token-called', { token: nextToken });

  res.json({ called: nextToken, message: `Token ${nextToken.token} has been called` });
});

// POST: Mark token as completed
router.post('/complete', (req, res) => {
  const { tokenId } = req.body;
  const token = store.queueTokens.find(t => t.id === tokenId);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'completed';
  token.completedAt = new Date().toISOString();

  // Also update appointment status
  const appt = store.appointments.find(a => a.id === token.appointmentId);
  if (appt) appt.status = 'completed';

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId: token.officeId });

  res.json({ message: `Token ${token.token} marked as completed`, token });
});

// POST: Skip a token
router.post('/skip', (req, res) => {
  const { tokenId } = req.body;
  const token = store.queueTokens.find(t => t.id === tokenId);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'skipped';

  sms.sendSMS(token.phone, `⚠️ Your token ${token.token} was skipped. Please check with the counter.`, 'alert');

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId: token.officeId });

  res.json({ message: `Token ${token.token} skipped`, token });
});

// POST: Re-queue a skipped token
router.post('/requeue', (req, res) => {
  const { tokenId } = req.body;
  const token = store.queueTokens.find(t => t.id === tokenId);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'waiting';
  token.createdAt = Date.now(); // Move to end of queue

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId: token.officeId });

  res.json({ message: `Token ${token.token} re-queued`, token });
});

// POST: Mark token as no-show
router.post('/no-show', (req, res) => {
  const { tokenId } = req.body;
  const token = store.queueTokens.find(t => t.id === tokenId);
  if (!token) return res.status(404).json({ error: 'Token not found' });

  token.status = 'no-show';
  token.noShowAt = new Date().toISOString();

  // Update linked appointment
  const appt = store.appointments.find(a => a.id === token.appointmentId);
  if (appt) appt.status = 'no-show';

  sms.sendSMS(token.phone, `⚠️ Token ${token.token} marked as no-show. Please visit the counter if you are present.`, 'alert');

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId: token.officeId });

  res.json({ message: `Token ${token.token} marked as no-show`, token });
});

// POST: Add walk-in user
router.post('/walk-in', (req, res) => {
  const { name, phone, serviceId, officeId, timeSlot } = req.body;

  if (!name || !phone || !serviceId || !officeId) {
    return res.status(400).json({ error: 'name, phone, serviceId, and officeId are required' });
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const assignedSlot = timeSlot || 'Walk-in';
  const token = store.generateToken();

  const appointment = {
    id: store.uuidv4(),
    name,
    phone,
    serviceId,
    officeId,
    date: today,
    timeSlot: assignedSlot,
    token,
    status: 'checked-in',
    type: 'walk-in',
    createdAt: new Date().toISOString(),
  };
  store.appointments.push(appointment);

  const queueToken = {
    id: store.uuidv4(),
    token,
    appointmentId: appointment.id,
    officeId,
    serviceId,
    date: today,
    timeSlot: assignedSlot,
    status: 'waiting',
    type: 'walk-in',
    name,
    phone,
    createdAt: Date.now(),
  };
  store.queueTokens.push(queueToken);

  sms.sendSMS(phone, `🎫 Walk-in registered! Your token: ${token}. Please wait for your turn.`, 'confirmation');

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId });

  res.status(201).json({ appointment, queueToken });
});

// PUT: Update slot capacity
router.put('/slot-capacity', (req, res) => {
  const { capacity } = req.body;
  if (!capacity || capacity < 1) return res.status(400).json({ error: 'Capacity must be >= 1' });
  store.slotConfig.defaultCapacity = capacity;
  res.json({ message: `Slot capacity updated to ${capacity}`, slotConfig: store.slotConfig });
});

// GET: SMS log
router.get('/sms-log', (req, res) => {
  res.json(store.smsLog.slice(-50).reverse());
});

// GET: All appointments for admin
router.get('/appointments/all', (req, res) => {
  const { date, officeId } = req.query;
  let appts = [...store.appointments];
  if (date) appts = appts.filter(a => a.date === date);
  if (officeId) appts = appts.filter(a => a.officeId === officeId);
  
  // Enrich with service/office names
  appts = appts.map(a => ({
    ...a,
    serviceName: store.services.find(s => s.id === a.serviceId)?.name,
    officeName: store.offices.find(o => o.id === a.officeId)?.name,
  }));

  res.json(appts.reverse());
});

module.exports = router;
