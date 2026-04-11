// ============================================
// APPOINTMENT ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const sms = require('../utils/sms');

// POST: Book a new appointment
router.post('/', (req, res) => {
  const { name, phone, serviceId, officeId, date, timeSlot } = req.body;

  if (!name || !phone || !serviceId || !officeId || !date || !timeSlot) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate name: letters, spaces, dots only — no numbers
  if (!/^[a-zA-Z\s.]{2,}$/.test(name.trim())) {
    return res.status(400).json({ error: 'Invalid name. Use only letters, spaces and dots (min 2 characters)' });
  }

  // Validate phone: exactly 10 digits
  if (!/^[0-9]{10}$/.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number. Must be exactly 10 digits' });
  }

  // Reject past dates
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (date < today) {
    return res.status(400).json({ error: 'Cannot book appointments for past dates' });
  }

  // Check slot availability
  const slots = store.getAvailableSlots(officeId, serviceId, date);
  const slot = slots.find(s => s.label === timeSlot);
  if (!slot || slot.available <= 0) {
    return res.status(400).json({ error: 'Selected slot is full' });
  }

  const token = store.generateToken();
  const appointment = {
    id: store.uuidv4(),
    name,
    phone,
    serviceId,
    officeId,
    date,
    timeSlot,
    token,
    status: 'confirmed', // confirmed, checked-in, completed, cancelled, no-show
    type: 'booked',
    bookedByUserId: req.body.bookedByUserId || null,
    createdAt: new Date().toISOString(),
  };

  store.appointments.push(appointment);

  // Create queue token
  const queueToken = {
    id: store.uuidv4(),
    token,
    appointmentId: appointment.id,
    officeId,
    serviceId,
    date,
    timeSlot,
    status: 'waiting', // waiting, called, serving, completed, skipped
    type: 'booked',
    name,
    phone,
    createdAt: Date.now(),
  };
  store.queueTokens.push(queueToken);

  // Send confirmation SMS
  sms.sendBookingConfirmation(appointment);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.emit('queue-updated', { officeId, serviceId });
    io.emit('appointment-booked', { appointment, queueToken });
  }

  res.status(201).json({ appointment, queueToken });
});

// GET: Get appointment by ID
router.get('/:id', (req, res) => {
  const appt = store.appointments.find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  
  const qToken = store.queueTokens.find(t => t.appointmentId === appt.id);
  const position = qToken ? store.getQueuePosition(qToken.id) : null;
  const waitTime = position ? store.estimateWaitTime(appt.officeId, appt.serviceId, position - 1) : 0;

  res.json({ ...appt, queuePosition: position, estimatedWaitMinutes: waitTime });
});

// GET: Lookup by phone
router.get('/by-phone/:phone', (req, res) => {
  const appts = store.appointments.filter(a => a.phone === req.params.phone && a.status !== 'cancelled');
  res.json(appts);
});

// GET: Lookup by userId (all bookings made by this user)
router.get('/by-user/:userId', (req, res) => {
  const appts = store.appointments.filter(a => a.bookedByUserId === req.params.userId && a.status !== 'cancelled');
  res.json(appts);
});

// GET: Lookup by token
router.get('/by-token/:token', (req, res) => {
  const appt = store.appointments.find(a => a.token === req.params.token);
  if (!appt) return res.status(404).json({ error: 'Not found' });

  const qToken = store.queueTokens.find(t => t.appointmentId === appt.id);
  const position = qToken ? store.getQueuePosition(qToken.id) : null;
  const waitTime = position ? store.estimateWaitTime(appt.officeId, appt.serviceId, position - 1) : 0;

  res.json({ ...appt, queuePosition: position, estimatedWaitMinutes: waitTime, queueStatus: qToken?.status });
});

// PUT: Reschedule
router.put('/:id/reschedule', (req, res) => {
  const { date, timeSlot } = req.body;
  const appt = store.appointments.find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  // Check new slot availability
  const slots = store.getAvailableSlots(appt.officeId, appt.serviceId, date);
  const slot = slots.find(s => s.label === timeSlot);
  if (!slot || slot.available <= 0) {
    return res.status(400).json({ error: 'Selected slot is full' });
  }

  appt.date = date;
  appt.timeSlot = timeSlot;

  // Update queue token
  const qToken = store.queueTokens.find(t => t.appointmentId === appt.id);
  if (qToken) {
    qToken.date = date;
    qToken.timeSlot = timeSlot;
  }

  sms.sendSMS(appt.phone, `📅 Your appointment ${appt.token} has been rescheduled to ${date} at ${timeSlot}.`, 'confirmation');

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId: appt.officeId });

  res.json(appt);
});

// PUT: Cancel
router.put('/:id/cancel', (req, res) => {
  const appt = store.appointments.find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  appt.status = 'cancelled';

  // Remove from queue
  const idx = store.queueTokens.findIndex(t => t.appointmentId === appt.id);
  if (idx !== -1) store.queueTokens[idx].status = 'cancelled';

  sms.sendSMS(appt.phone, `❌ Your appointment ${appt.token} has been cancelled.`, 'confirmation');

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId: appt.officeId });

  res.json(appt);
});

// PUT: Check-in
router.put('/:id/checkin', (req, res) => {
  const appt = store.appointments.find(a => a.id === req.params.id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  appt.status = 'checked-in';

  const qToken = store.queueTokens.find(t => t.appointmentId === appt.id);
  if (qToken) qToken.checkedInAt = new Date().toISOString();

  sms.sendSMS(appt.phone, `📍 You've checked in! Token: ${appt.token}. Please wait for your turn.`, 'confirmation');

  const io = req.app.get('io');
  if (io) io.emit('queue-updated', { officeId: appt.officeId });

  res.json(appt);
});

module.exports = router;
