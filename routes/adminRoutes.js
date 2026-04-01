const express = require('express');

function createAdminRoutes(deps) {
  const {
    db,
    getDailyLinkReportHourBr,
    getDailyLinkReportMeta,
    DAILY_LINK_REPORT_DEFAULT_HOUR_BR,
    runDailyLinksSummary,
    jobHealth
  } = deps;
  const router = express.Router();

  async function requireAdminApi(req, res, next) {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Não autorizado' });
    const user = await db.get('SELECT role FROM users WHERE id = ?', [req.session.userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Apenas admin' });
    next();
  }

  router.get('/api/admin/daily-link-report', requireAdminApi, async (req, res) => {
    const hourBr = await getDailyLinkReportHourBr();
    const meta = await getDailyLinkReportMeta();
    res.json({
      hour_br: hourBr,
      default_hour_br: DAILY_LINK_REPORT_DEFAULT_HOUR_BR,
      last_sent_day_key: meta.last_sent_day_key || null,
      last_sent_at: meta.sent_at || null
    });
  });

  router.put('/api/admin/daily-link-report', requireAdminApi, async (req, res) => {
    const hour = parseInt(req.body?.hour_br, 10);
    if (Number.isNaN(hour) || hour < 0 || hour > 23) return res.status(400).json({ error: 'hour_br deve ser entre 0 e 23' });
    const val = String(hour);
    if (db.usePg) await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", ['daily_link_report_hour_br', val]);
    else await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", ['daily_link_report_hour_br', val]);
    res.json({ success: true, hour_br: hour });
  });

  router.post('/api/admin/daily-link-report/test-telegram', requireAdminApi, async (req, res) => {
    const result = await runDailyLinksSummary(true);
    if (!result || !result.sent) {
      return res.status(400).json({ error: 'Não foi possível enviar o teste', reason: result?.reason || 'unknown' });
    }
    res.json({ success: true, message: 'Resumo diário enviado no Telegram (teste).' });
  });

  router.get('/api/admin/system-health', requireAdminApi, async (req, res) => {
    res.json({
      now: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      jobs: jobHealth
    });
  });

  return router;
}

module.exports = { createAdminRoutes };
