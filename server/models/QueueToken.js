const mongoose = require('mongoose');

const queueTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  appointmentId: { type: String, required: true },
  officeId: { type: String, required: true },
  serviceId: { type: String, required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  status: {
    type: String,
    enum: ['waiting', 'called', 'serving', 'completed', 'skipped', 'cancelled', 'no-show'],
    default: 'waiting',
  },
  type: { type: String, enum: ['booked', 'walk-in'], default: 'booked' },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  calledAt: { type: String, default: null },
  completedAt: { type: String, default: null },
  checkedInAt: { type: String, default: null },
  noShowAt: { type: String, default: null },
}, { timestamps: true });

// Index for queue lookups
queueTokenSchema.index({ officeId: 1, status: 1, date: 1 });

module.exports = mongoose.model('QueueToken', queueTokenSchema);
