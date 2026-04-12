// ============================================
// SERVICES & OFFICES ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET all regions
router.get('/regions', (req, res) => {
  res.json(store.regions);
});

// GET all services
router.get('/services', (req, res) => {
  res.json(store.services);
});

// GET all offices
router.get('/offices', (req, res) => {
  res.json(store.offices);
});

// GET offices for a specific service (optionally filtered by region)
router.get('/offices/by-service/:serviceId', (req, res) => {
  const { regionId } = req.query;
  let filtered = store.offices.filter(o => o.serviceIds.includes(req.params.serviceId));
  if (regionId) {
    filtered = filtered.filter(o => o.regionId === regionId);
  }
  res.json(filtered);
});

// GET available time slots
router.get('/slots', async (req, res) => {
  const { officeId, serviceId, date, tz } = req.query;
  if (!officeId || !serviceId || !date) {
    return res.status(400).json({ error: 'officeId, serviceId, and date are required' });
  }
  try {
    const timezoneOffset = tz !== undefined ? parseInt(tz, 10) : undefined;
    const slots = await store.getAvailableSlots(officeId, serviceId, date, timezoneOffset);
    res.json(slots);
  } catch (err) {
    console.error('Error fetching slots:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
