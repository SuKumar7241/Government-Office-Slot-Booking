// ============================================
// QUEUE ROUTES
// ============================================
const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET: Live queue for an office (optionally filtered by service and date)
router.get('/:officeId', (req, res) => {
  const { serviceId, date } = req.query;
  let queue = store.queueTokens.filter(t => t.officeId === req.params.officeId && t.status !== 'cancelled');

  if (serviceId) queue = queue.filter(t => t.serviceId === serviceId);
  if (date) queue = queue.filter(t => t.date === date);

  // Sort: serving first, then called, then waiting by creation time
  const statusOrder = { serving: 0, called: 1, waiting: 2, completed: 3, skipped: 4 };
  queue.sort((a, b) => {
    const diff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
    if (diff !== 0) return diff;
    return a.createdAt - b.createdAt;
  });

  // Add position and estimated wait
  const waitingQueue = queue.filter(t => t.status === 'waiting');
  queue = queue.map(t => {
    const pos = waitingQueue.findIndex(w => w.id === t.id);
    const position = pos === -1 ? null : pos + 1;
    const service = store.services.find(s => s.id === t.serviceId);
    const waitTime = position ? store.estimateWaitTime(t.officeId, t.serviceId, position - 1) : 0;
    return {
      ...t,
      position,
      estimatedWaitMinutes: waitTime,
      serviceName: service?.name,
    };
  });

  res.json(queue);
});

// GET: Queue stats for an office
router.get('/:officeId/stats', (req, res) => {
  const now = new Date();
  const date = req.query.date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayTokens = store.queueTokens.filter(t => t.officeId === req.params.officeId && t.date === date);

  const stats = {
    totalToday: todayTokens.length,
    waiting: todayTokens.filter(t => t.status === 'waiting').length,
    called: todayTokens.filter(t => t.status === 'called').length,
    serving: todayTokens.filter(t => t.status === 'serving').length,
    completed: todayTokens.filter(t => t.status === 'completed').length,
    skipped: todayTokens.filter(t => t.status === 'skipped').length,
    booked: todayTokens.filter(t => t.type === 'booked').length,
    walkIn: todayTokens.filter(t => t.type === 'walk-in').length,
  };

  res.json(stats);
});

module.exports = router;
