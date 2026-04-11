const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, default: 'general' },
  status: { type: String, default: 'delivered' },
}, { timestamps: true });

module.exports = mongoose.model('SmsLog', smsLogSchema);
