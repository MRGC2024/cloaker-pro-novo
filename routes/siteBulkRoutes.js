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

  /** Remove todos os sites do usuário logado (visitas e fallbacks do site em cascata). */
  router.post('/api/sites/bulk/delete-all', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    if (!req.body || req.body.confirm_delete_all !== true) {
      return res.status(400).json({ error: 'Envie confirm_delete_all: true para confirmar.' });
    }
    const userId = req.session.userId;
    try {
      const rows = await db.all('SELECT site_id FROM sites WHERE user_id = ?', [userId]);
      const siteIds = rows.map((r) => r.site_id).filter(Boolean);
      if (siteIds.length === 0) return res.json({ success: true, deleted: 0 });
      await db.run(
        'DELETE FROM site_fallbacks WHERE site_id IN (SELECT site_id FROM sites WHERE user_id = ?)',
        [userId]
      );
      await db.run(
        'DELETE FROM visitors WHERE site_id IN (SELECT site_id FROM sites WHERE user_id = ?)',
        [userId]
      );
      await db.run('DELETE FROM sites WHERE user_id = ?', [userId]);
      res.json({ success: true, deleted: siteIds.length });
    } catch (e) {
      res.status(500).json({ error: e.message || 'Erro ao remover sites' });
    }
  });

  return router;
}

module.exports = { createSiteBulkRoutes };
