// ============================================
// MOCK SMS SERVICE (with MongoDB logging)
// ============================================
const store = require('../data/store');
const SmsLog = require('../models/SmsLog');

function sendSMS(phone, message, type = 'general') {
  // Log to console (mock)
  console.log(`📱 [SMS → ${phone}] ${message}`);

  // Persist to MongoDB (fire-and-forget)
  SmsLog.create({ phone, message, type, status: 'delivered' }).catch(() => {});

  return { phone, message, type, status: 'delivered' };
}

function sendBookingConfirmation(appointment) {
  const service = store.services.find(s => s.id === appointment.serviceId);
  const office = store.offices.find(o => o.id === appointment.officeId);
  const msg = `✅ Booking Confirmed!\nToken: ${appointment.token}\nService: ${service?.name}\nOffice: ${office?.name}\nDate: ${appointment.date}\nSlot: ${appointment.timeSlot}\nPlease arrive 10 mins early.`;
  return sendSMS(appointment.phone, msg, 'confirmation');
}

function sendReminderSMS(appointment) {
  const msg = `⏰ Reminder: Your appointment (${appointment.token}) is coming up at ${appointment.timeSlot} today. Please be ready!`;
  return sendSMS(appointment.phone, msg, 'reminder');
}

function sendNextInQueueAlert(appointment) {
  const msg = `🔔 You're NEXT in queue! Token: ${appointment.token}. Please proceed to the counter.`;
  return sendSMS(appointment.phone, msg, 'alert');
}

module.exports = {
  sendSMS,
  sendBookingConfirmation,
  sendReminderSMS,
  sendNextInQueueAlert,
};
