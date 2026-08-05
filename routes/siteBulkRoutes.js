const express = require('express');

function createSiteBulkRoutes(deps) {
  const { db, usePg, deleteSiteCascade, deleteOrphanLandingPages, collectSitePageIds } = deps;
  const isPg = !!usePg;
  const router = express.Router();

  async function runOrFail(sql, params) {
    const ok = await db.run(sql, params);
    if (!isPg && ok === false) throw new Error('Falha ao executar operação no banco');
  }

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

  /** Remove todos os sites do usuário logado (+ páginas white/gray órfãs vinculadas). */
  router.post('/api/sites/bulk/delete-all', async (req, res) => {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const body = req.body || {};
    const okConfirm =
      body.confirm_delete_all === true ||
      body.confirm_delete_all === 'true' ||
      body.confirm === 'delete_all';
    if (!okConfirm) {
      return res.status(400).json({ error: 'Envie confirm_delete_all: true para confirmar.' });
    }
    const userId = Number(req.session.userId);
    if (!userId || !Number.isFinite(userId)) {
      return res.status(400).json({ error: 'Sessão inválida. Faça login novamente.' });
    }
    try {
      const rows = await db.all(
        'SELECT site_id, landing_page_id, gray_page_id, offer_page_id FROM sites WHERE user_id = ?',
        [userId]
      );
      const siteIds = (rows || []).map((r) => r.site_id).filter(Boolean);
      if (siteIds.length === 0) return res.json({ success: true, deleted: 0, deleted_pages: 0 });

      const allPageIds = [];
      if (typeof collectSitePageIds === 'function') {
        for (const row of rows) allPageIds.push(...collectSitePageIds(row));
      }

      let deletedPages = 0;
      if (typeof deleteSiteCascade === 'function') {
        for (const sid of siteIds) {
          const result = await deleteSiteCascade(sid, userId);
          if (result && result.ok) deletedPages += result.deleted_pages || 0;
        }
      } else {
        for (const sid of siteIds) {
          await runOrFail('DELETE FROM site_fallbacks WHERE site_id = ?', [sid]);
          await runOrFail('DELETE FROM visitors WHERE site_id = ?', [sid]);
          await runOrFail('DELETE FROM sites WHERE site_id = ?', [sid]);
        }
        if (typeof deleteOrphanLandingPages === 'function') {
          deletedPages = await deleteOrphanLandingPages(allPageIds, userId);
        }
      }

      res.json({ success: true, deleted: siteIds.length, deleted_pages: deletedPages });
    } catch (e) {
      console.error('[bulk/delete-all]', e);
      res.status(500).json({ error: e.message || 'Erro ao remover sites' });
    }
  });

  return router;
}

module.exports = { createSiteBulkRoutes };
