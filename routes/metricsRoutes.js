const express = require('express');

function createMetricsRoutes(deps) {
  const { metricsService } = deps;
  const router = express.Router();
  const cacheMs = Math.max(5000, parseInt(process.env.METRICS_CACHE_MS || '15000', 10));
  const cache = new Map();

  function cacheKey(prefix, req) {
    return [
      prefix,
      req.session?.userId || 'anon',
      req.query?.period || '',
      req.query?.site || ''
    ].join('|');
  }

  function getCached(key) {
    const hit = cache.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) { cache.delete(key); return null; }
    return hit.value;
  }

  function setCached(key, value) {
    cache.set(key, { value, expiresAt: Date.now() + cacheMs });
  }

  router.get('/api/stats', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const userId = req.session.userId;
    const period = req.query.period || 'today';
    const siteId = req.query.site || null;
    const key = cacheKey('stats', req);
    const cached = getCached(key);
    if (cached) return res.json(cached);
    const stats = await metricsService.getStatsForUser(userId, period, siteId);
    setCached(key, stats);
    res.json(stats);
  });

  router.get('/api/analytics', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const userId = req.session.userId;
    const period = req.query.period || '7d';
    const siteId = req.query.site || null;
    const key = cacheKey('analytics', req);
    const cached = getCached(key);
    if (cached) return res.json(cached);
    const analytics = await metricsService.getAnalyticsForUser(userId, period, siteId);
    setCached(key, analytics);
    res.json(analytics);
  });

  return router;
}

module.exports = { createMetricsRoutes };
