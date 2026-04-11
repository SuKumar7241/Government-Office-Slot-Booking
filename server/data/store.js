// ============================================
// STATIC DATA & HELPER FUNCTIONS
// ============================================
// Dynamic data (users, appointments, etc.) is now in MongoDB.
// This file only holds static reference data and utility functions.
// ============================================
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Appointment = require('../models/Appointment');

// ---------- AUTH HELPERS ----------
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateSessionToken() {
  return uuidv4() + '-' + Date.now().toString(36);
}

// ---------- REGIONS (4 states, 4-5 cities each) ----------
const regions = [
  { id: 'reg-1', name: 'Delhi NCR', description: 'New Delhi, Noida, Gurgaon, Faridabad, Ghaziabad', icon: '🏛️' },
  { id: 'reg-2', name: 'Maharashtra', description: 'Mumbai, Pune, Nagpur, Nashik', icon: '🌆' },
  { id: 'reg-3', name: 'Karnataka', description: 'Bangalore, Mysore, Mangalore, Hubli', icon: '🌴' },
  { id: 'reg-4', name: 'Rajasthan', description: 'Jaipur, Jodhpur, Udaipur, Kota', icon: '🏜️' },
];

// ---------- SERVICES ----------
const services = [
  { id: 'svc-1', name: 'Passport', description: 'New passport application or renewal', icon: '🛂', avgServiceTime: 15 },
  { id: 'svc-2', name: 'Driving License', description: 'Apply or renew driving license', icon: '🚗', avgServiceTime: 10 },
  { id: 'svc-3', name: 'Birth Certificate', description: 'Obtain birth certificate copy', icon: '📄', avgServiceTime: 8 },
  { id: 'svc-4', name: 'Property Registration', description: 'Register property documents', icon: '🏠', avgServiceTime: 20 },
  { id: 'svc-5', name: 'Income Certificate', description: 'Apply for income certificate', icon: '💰', avgServiceTime: 10 },
  { id: 'svc-6', name: 'Aadhaar Update', description: 'Update Aadhaar card details', icon: '🪪', avgServiceTime: 12 },
];

// ---------- OFFICES (6 per region, all services covered) ----------
const offices = [
  // ── Delhi NCR ──
  { id: 'off-1',  name: 'Passport Seva Kendra Delhi',       address: '23 Bhikaji Cama Place, RK Puram',   city: 'New Delhi',  regionId: 'reg-1', serviceIds: ['svc-1', 'svc-3', 'svc-6'] },
  { id: 'off-2',  name: 'RTO Sarai Kale Khan',              address: '5th Floor, IP Estate',              city: 'New Delhi',  regionId: 'reg-1', serviceIds: ['svc-2', 'svc-5'] },
  { id: 'off-3',  name: 'District Collectorate Noida',      address: 'Sector 27, Near City Centre',       city: 'Noida',      regionId: 'reg-1', serviceIds: ['svc-3', 'svc-4', 'svc-5', 'svc-6'] },
  { id: 'off-4',  name: 'Mini Secretariat Gurgaon',         address: 'Civil Lines, Sector 11',            city: 'Gurgaon',    regionId: 'reg-1', serviceIds: ['svc-1', 'svc-2', 'svc-4', 'svc-5'] },
  { id: 'off-5',  name: 'SDM Office Faridabad',             address: 'NIT Complex, Sector 12',            city: 'Faridabad',  regionId: 'reg-1', serviceIds: ['svc-3', 'svc-5', 'svc-6'] },
  { id: 'off-6',  name: 'Tehsil Office Ghaziabad',          address: '42 GT Road, Raj Nagar',             city: 'Ghaziabad',  regionId: 'reg-1', serviceIds: ['svc-1', 'svc-2', 'svc-4', 'svc-6'] },

  // ── Maharashtra ──
  { id: 'off-7',  name: 'Passport Office BKC Mumbai',       address: 'Bandra Kurla Complex, Bandra East', city: 'Mumbai',     regionId: 'reg-2', serviceIds: ['svc-1', 'svc-3', 'svc-6'] },
  { id: 'off-8',  name: 'RTO Andheri Mumbai',               address: 'Andheri East, near WEH Metro',      city: 'Mumbai',     regionId: 'reg-2', serviceIds: ['svc-2', 'svc-5'] },
  { id: 'off-9',  name: 'District Collectorate Pune',       address: '2 Bund Garden Road, Camp',          city: 'Pune',       regionId: 'reg-2', serviceIds: ['svc-1', 'svc-3', 'svc-4', 'svc-5'] },
  { id: 'off-10', name: 'Sub-Registrar Office Pune',        address: 'Shivajinagar Court Complex',        city: 'Pune',       regionId: 'reg-2', serviceIds: ['svc-4', 'svc-6'] },
  { id: 'off-11', name: 'Divisional Commissioner Nagpur',   address: 'Civil Lines, near High Court',      city: 'Nagpur',     regionId: 'reg-2', serviceIds: ['svc-1', 'svc-2', 'svc-3', 'svc-5', 'svc-6'] },
  { id: 'off-12', name: 'Tehsil Office Nashik',             address: 'Old Agra Road, Panchavati',         city: 'Nashik',     regionId: 'reg-2', serviceIds: ['svc-2', 'svc-3', 'svc-4', 'svc-5', 'svc-6'] },

  // ── Karnataka ──
  { id: 'off-13', name: 'Passport Seva Kendra Bangalore',   address: 'Lalbagh Road, Basavanagudi',        city: 'Bangalore',  regionId: 'reg-3', serviceIds: ['svc-1', 'svc-6'] },
  { id: 'off-14', name: 'RTO Koramangala Bangalore',        address: '80 Feet Road, Koramangala',         city: 'Bangalore',  regionId: 'reg-3', serviceIds: ['svc-2', 'svc-5'] },
  { id: 'off-15', name: 'DC Office Indiranagar',            address: '100 Feet Road, Indiranagar',        city: 'Bangalore',  regionId: 'reg-3', serviceIds: ['svc-3', 'svc-4', 'svc-5', 'svc-6'] },
  { id: 'off-16', name: 'District Office Mysore',           address: 'Nazarbad, near Palace',             city: 'Mysore',     regionId: 'reg-3', serviceIds: ['svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-5'] },
  { id: 'off-17', name: 'SDM Office Mangalore',             address: 'Bunder, near Old Port',             city: 'Mangalore',  regionId: 'reg-3', serviceIds: ['svc-1', 'svc-3', 'svc-4', 'svc-6'] },
  { id: 'off-18', name: 'Tehsil Office Hubli',              address: 'Lamington Road, Hubli',             city: 'Hubli',      regionId: 'reg-3', serviceIds: ['svc-2', 'svc-3', 'svc-5', 'svc-6'] },

  // ── Rajasthan ──
  { id: 'off-19', name: 'Passport Office Jaipur',           address: 'Tonk Road, near SMS Hospital',      city: 'Jaipur',     regionId: 'reg-4', serviceIds: ['svc-1', 'svc-6'] },
  { id: 'off-20', name: 'RTO Jaipur',                       address: 'Sethi Colony, Jaipur',              city: 'Jaipur',     regionId: 'reg-4', serviceIds: ['svc-2', 'svc-5'] },
  { id: 'off-21', name: 'District Collectorate Jaipur',     address: 'MI Road, Panch Batti',              city: 'Jaipur',     regionId: 'reg-4', serviceIds: ['svc-3', 'svc-4', 'svc-5', 'svc-6'] },
  { id: 'off-22', name: 'Divisional Office Jodhpur',        address: 'High Court Road, Ratanada',         city: 'Jodhpur',    regionId: 'reg-4', serviceIds: ['svc-1', 'svc-2', 'svc-3', 'svc-4', 'svc-5'] },
  { id: 'off-23', name: 'SDM Office Udaipur',               address: 'Sukhadia Circle, Udaipur',          city: 'Udaipur',    regionId: 'reg-4', serviceIds: ['svc-1', 'svc-3', 'svc-4', 'svc-6'] },
  { id: 'off-24', name: 'Tehsil Office Kota',               address: 'Nayapura, near Chambal Garden',     city: 'Kota',       regionId: 'reg-4', serviceIds: ['svc-2', 'svc-3', 'svc-5', 'svc-6'] },
];

// ---------- SLOT CONFIG ----------
const slotConfig = {
  startHour: 9,
  endHour: 17,
  slotDurationMinutes: 30,
  defaultCapacity: 5, // per slot
};

// ---------- TOKEN COUNTER (persisted via DB count) ----------
async function generateToken() {
  const count = await Appointment.countDocuments();
  return `GQ-${101 + count}`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateTimeSlots(date) {
  const slots = [];
  for (let h = slotConfig.startHour; h < slotConfig.endHour; h++) {
    for (let m = 0; m < 60; m += slotConfig.slotDurationMinutes) {
      const start = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const endM = m + slotConfig.slotDurationMinutes;
      const endH = endM >= 60 ? h + 1 : h;
      const end = `${String(endH).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
      slots.push({ start, end, label: `${start} - ${end}` });
    }
  }
  return slots;
}

async function getSlotBookingCount(officeId, serviceId, date, slotLabel) {
  return Appointment.countDocuments({
    officeId,
    serviceId,
    date,
    timeSlot: slotLabel,
    status: { $ne: 'cancelled' },
  });
}

async function getAvailableSlots(officeId, serviceId, date) {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Reject past dates entirely – return no slots
  if (date < today) {
    return [];
  }

  const slots = generateTimeSlots(date);
  const isToday = date === today;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Batch-fetch all booked counts for this office+service+date
  const bookings = await Appointment.aggregate([
    { $match: { officeId, serviceId, date, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$timeSlot', count: { $sum: 1 } } },
  ]);
  const bookingMap = {};
  bookings.forEach(b => { bookingMap[b._id] = b.count; });

  return slots
    .map(slot => {
      const booked = bookingMap[slot.label] || 0;
      const [startH, startM] = slot.start.split(':').map(Number);
      const slotStartMinutes = startH * 60 + startM;
      const isPast = isToday && slotStartMinutes <= currentMinutes;

      return {
        ...slot,
        booked,
        capacity: slotConfig.defaultCapacity,
        available: isPast ? 0 : slotConfig.defaultCapacity - booked,
        isPast,
      };
    })
    .filter(slot => !slot.isPast);
}

function estimateWaitTime(serviceId, tokenPosition) {
  const service = services.find(s => s.id === serviceId);
  const avgTime = service ? service.avgServiceTime : 10;
  return tokenPosition * avgTime;
}

module.exports = {
  regions,
  services,
  offices,
  slotConfig,
  generateToken,
  generateTimeSlots,
  getSlotBookingCount,
  getAvailableSlots,
  estimateWaitTime,
  hashPassword,
  generateSessionToken,
  uuidv4,
};
