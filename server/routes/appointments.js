// ============================================
// APPOINTMENT ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const sms = require('../utils/sms');
const Appointment = require('../models/Appointment');
const QueueToken = require('../models/QueueToken');

// POST: Book a new appointment
router.post('/', async (req, res) => {
  try {
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
    const slots = await store.getAvailableSlots(officeId, serviceId, date);
    const slot = slots.find(s => s.label === timeSlot);
    if (!slot || slot.available <= 0) {
      return res.status(400).json({ error: 'Selected slot is full' });
    }

    const token = await store.generateToken();
    const appointment = await Appointment.create({
      name,
      phone,
      serviceId,
      officeId,
      date,
      timeSlot,
      token,
      status: 'confirmed',
      type: 'booked',
      bookedByUserId: req.body.bookedByUserId || null,
    });

    // Create queue token
    const queueToken = await QueueToken.create({
      token,
      appointmentId: appointment._id.toString(),
      officeId,
      serviceId,
      date,
      timeSlot,
      status: 'waiting',
      type: 'booked',
      name,
      phone,
    });

    // Send confirmation SMS
    sms.sendBookingConfirmation({ ...appointment.toObject(), token });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('queue-updated', { officeId, serviceId });
      io.emit('appointment-booked', { appointment, queueToken });
    }

    res.status(201).json({ appointment, queueToken });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET: Get appointment by ID
router.get('/:id', async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    const qToken = await QueueToken.findOne({ appointmentId: appt._id.toString(), status: 'waiting' });
    let position = null;
    let waitTime = 0;

    if (qToken) {
      const ahead = await QueueToken.countDocuments({
        officeId: qToken.officeId,
        status: 'waiting',
        createdAt: { $lt: qToken.createdAt },
      });
      position = ahead + 1;
      waitTime = store.estimateWaitTime(appt.serviceId, position - 1);
    }

    res.json({ ...appt.toObject(), id: appt._id, queuePosition: position, estimatedWaitMinutes: waitTime });
  } catch (err) {
    console.error('Get appointment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET: Lookup by phone
router.get('/by-phone/:phone', async (req, res) => {
  try {
    const appts = await Appointment.find({ phone: req.params.phone, status: { $ne: 'cancelled' } });
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET: Lookup by userId (all bookings made by this user)
router.get('/by-user/:userId', async (req, res) => {
  try {
    const appts = await Appointment.find({ bookedByUserId: req.params.userId, status: { $ne: 'cancelled' } });
    res.json(appts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET: Lookup by token
router.get('/by-token/:token', async (req, res) => {
  try {
    const appt = await Appointment.findOne({ token: req.params.token });
    if (!appt) return res.status(404).json({ error: 'Not found' });

    const qToken = await QueueToken.findOne({ appointmentId: appt._id.toString() });
    let position = null;
    let waitTime = 0;

    if (qToken && qToken.status === 'waiting') {
      const ahead = await QueueToken.countDocuments({
        officeId: qToken.officeId,
        status: 'waiting',
        createdAt: { $lt: qToken.createdAt },
      });
      position = ahead + 1;
      waitTime = store.estimateWaitTime(appt.serviceId, position - 1);
    }

    res.json({ ...appt.toObject(), id: appt._id, queuePosition: position, estimatedWaitMinutes: waitTime, queueStatus: qToken?.status });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT: Reschedule
router.put('/:id/reschedule', async (req, res) => {
  try {
    const { date, timeSlot } = req.body;
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    // Check new slot availability
    const slots = await store.getAvailableSlots(appt.officeId, appt.serviceId, date);
    const slot = slots.find(s => s.label === timeSlot);
    if (!slot || slot.available <= 0) {
      return res.status(400).json({ error: 'Selected slot is full' });
    }

    appt.date = date;
    appt.timeSlot = timeSlot;
    await appt.save();

    // Update queue token
    await QueueToken.findOneAndUpdate(
      { appointmentId: appt._id.toString() },
      { date, timeSlot }
    );

    sms.sendSMS(appt.phone, `📅 Your appointment ${appt.token} has been rescheduled to ${date} at ${timeSlot}.`, 'confirmation');

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId: appt.officeId });

    res.json(appt);
  } catch (err) {
    console.error('Reschedule error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT: Cancel
router.put('/:id/cancel', async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    appt.status = 'cancelled';
    await appt.save();

    // Update queue token
    await QueueToken.findOneAndUpdate(
      { appointmentId: appt._id.toString() },
      { status: 'cancelled' }
    );

    sms.sendSMS(appt.phone, `❌ Your appointment ${appt.token} has been cancelled.`, 'confirmation');

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId: appt.officeId });

    res.json(appt);
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT: Check-in
router.put('/:id/checkin', async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });

    appt.status = 'checked-in';
    await appt.save();

    await QueueToken.findOneAndUpdate(
      { appointmentId: appt._id.toString() },
      { checkedInAt: new Date().toISOString() }
    );

    sms.sendSMS(appt.phone, `📍 You've checked in! Token: ${appt.token}. Please wait for your turn.`, 'confirmation');

    const io = req.app.get('io');
    if (io) io.emit('queue-updated', { officeId: appt.officeId });

    res.json(appt);
  } catch (err) {
    console.error('Checkin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
