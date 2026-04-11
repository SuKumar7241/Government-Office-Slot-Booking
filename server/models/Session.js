const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, index: true },
  userId: { type: String, required: true },
  role: { type: String, required: true, enum: ['user', 'admin'] },
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
