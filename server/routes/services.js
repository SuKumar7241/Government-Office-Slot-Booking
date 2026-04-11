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
router.get('/slots', (req, res) => {
  const { officeId, serviceId, date } = req.query;
  if (!officeId || !serviceId || !date) {
    return res.status(400).json({ error: 'officeId, serviceId, and date are required' });
  }
  const slots = store.getAvailableSlots(officeId, serviceId, date);
  res.json(slots);
});

module.exports = router;
