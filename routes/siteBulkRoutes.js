const express = require('express');

function createSiteBulkRoutes(deps) {
  const { db } = deps;
  const router = express.Router();

  router.put('/api/sites/bulk/status', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const ids = Array.isArray(req.body?.site_ids) ? req.body.site_ids.filter(Boolean) : [];
    const isActive = req.body?.is_active ? 1 : 0;
    if (ids.length === 0) return res.status(400).json({ error: 'Selecione ao menos um site' });
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE sites SET is_active = ? WHERE user_id = ? AND site_id IN (${placeholders})`;
    await db.run(sql, [isActive, req.session.userId, ...ids]);
    res.json({ success: true, updated: ids.length });
  });

  router.put('/api/sites/bulk/fallback', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const ids = Array.isArray(req.body?.site_ids) ? req.body.site_ids.filter(Boolean) : [];
    const useFallback = req.body?.use_fallback ? 1 : 0;
    if (ids.length === 0) return res.status(400).json({ error: 'Selecione ao menos um site' });
    const placeholders = ids.map(() => '?').join(',');
    const sql = `UPDATE sites SET use_fallback = ?${useFallback ? '' : ', fallback_override_url = NULL'} WHERE user_id = ? AND site_id IN (${placeholders})`;
    await db.run(sql, [useFallback, req.session.userId, ...ids]);
    res.json({ success: true, updated: ids.length });
  });

  return router;
}

module.exports = { createSiteBulkRoutes };
