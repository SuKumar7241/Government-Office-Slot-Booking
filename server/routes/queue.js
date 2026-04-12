// ============================================
// QUEUE ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');
const QueueToken = require('../models/QueueToken');

// GET: Live queue for an office (optionally filtered by service and date)
router.get('/:officeId', async (req, res) => {
  try {
    const { serviceId, date } = req.query;
    const filter = { officeId: req.params.officeId, status: { $ne: 'cancelled' } };
    if (serviceId) filter.serviceId = serviceId;
    if (date) filter.date = date;

    let queue = await QueueToken.find(filter).lean();

    // Sort: serving first, then called, then waiting by creation time
    const statusOrder = { serving: 0, called: 1, waiting: 2, completed: 3, skipped: 4, 'no-show': 5 };
    queue.sort((a, b) => {
      const diff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
      if (diff !== 0) return diff;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    // Add position and estimated wait
    const waitingQueue = queue.filter(t => t.status === 'waiting');
    queue = queue.map(t => {
      const pos = waitingQueue.findIndex(w => w._id.toString() === t._id.toString());
      const position = pos === -1 ? null : pos + 1;
      const service = store.services.find(s => s.id === t.serviceId);
      const waitTime = position ? store.estimateWaitTime(t.serviceId, position - 1) : 0;
      return {
        ...t,
        id: t._id,
        position,
        estimatedWaitMinutes: waitTime,
        serviceName: service?.name,
      };
    });

    res.json(queue);
  } catch (err) {
    console.error('Queue fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET: Queue stats for an office
router.get('/:officeId/stats', async (req, res) => {
  try {
    const now = new Date();
    const date = req.query.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const officeId = req.params.officeId;

    const todayTokens = await QueueToken.find({ officeId, date }).lean();

    const stats = {
      totalToday: todayTokens.length,
      waiting: todayTokens.filter(t => t.status === 'waiting').length,
      called: todayTokens.filter(t => t.status === 'called').length,
      serving: todayTokens.filter(t => t.status === 'serving').length,
      completed: todayTokens.filter(t => t.status === 'completed').length,
      skipped: todayTokens.filter(t => t.status === 'skipped').length,
      noShow: todayTokens.filter(t => t.status === 'no-show').length,
      booked: todayTokens.filter(t => t.type === 'booked').length,
      walkIn: todayTokens.filter(t => t.type === 'walk-in').length,
    };

    res.json(stats);
  } catch (err) {
    console.error('Queue stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
