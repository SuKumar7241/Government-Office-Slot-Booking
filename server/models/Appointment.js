const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  serviceId: { type: String, required: true },
  officeId: { type: String, required: true },
  date: { type: String, required: true },
  timeSlot: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['confirmed', 'checked-in', 'completed', 'cancelled', 'no-show'],
    default: 'confirmed',
  },
  type: { type: String, enum: ['booked', 'walk-in'], default: 'booked' },
  bookedByUserId: { type: String, default: null },
}, { timestamps: true });

// Index for common queries
appointmentSchema.index({ officeId: 1, serviceId: 1, date: 1 });
appointmentSchema.index({ phone: 1 });
appointmentSchema.index({ bookedByUserId: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
