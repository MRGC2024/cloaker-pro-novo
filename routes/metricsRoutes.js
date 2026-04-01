const express = require('express');

function createMetricsRoutes(deps) {
  const { metricsService } = deps;
  const router = express.Router();

  router.get('/api/stats', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const userId = req.session.userId;
    const period = req.query.period || 'today';
    const siteId = req.query.site || null;
    const stats = await metricsService.getStatsForUser(userId, period, siteId);
    res.json(stats);
  });

  router.get('/api/analytics', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const userId = req.session.userId;
    const period = req.query.period || '7d';
    const siteId = req.query.site || null;
    const analytics = await metricsService.getAnalyticsForUser(userId, period, siteId);
    res.json(analytics);
  });

  return router;
}

module.exports = { createMetricsRoutes };
