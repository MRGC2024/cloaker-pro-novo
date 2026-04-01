function createMetricsService(deps) {
  const { db, getBrasiliaDateRange } = deps;

  async function getStatsForUser(userId, period = 'today', siteId = null) {
    const { start, end } = getBrasiliaDateRange(period);
    const userSites = "v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?)";
    const siteFilter = siteId && siteId !== 'all' ? " AND v.site_id = ?" : '';
    const params = siteId && siteId !== 'all' ? [start, end, userId, siteId] : [start, end, userId];
    const baseWhere = `FROM visitors v WHERE v.created_at >= ? AND v.created_at < ? AND ${userSites}${siteFilter}`;
    const hourExpr = db.usePg ? "to_char(date_trunc('hour', v.created_at), 'YYYY-MM-DD HH24:00')" : "strftime('%Y-%m-%d %H:00', v.created_at)";

    const num = (v) => (v == null || v === '' ? 0 : Number(v)) || 0;
    const [agg, byBrowser, byOS, byCountry, byReferrer, byHour, blockReasons, bySite] = await Promise.all([
      db.get(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN v.was_blocked = 0 THEN 1 ELSE 0 END) as allowed,
                SUM(CASE WHEN v.is_bot = 1 THEN 1 ELSE 0 END) as bots,
                SUM(CASE WHEN v.device_type IN ('mobile', 'tablet') THEN 1 ELSE 0 END) as mobile,
                SUM(CASE WHEN (v.device_type = 'desktop' OR v.device_type IS NULL) THEN 1 ELSE 0 END) as desktop
         ${baseWhere}`,
        params
      ),
      db.all(`SELECT v.browser as browser, COUNT(*) as count ${baseWhere} AND v.browser IS NOT NULL GROUP BY v.browser ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT v.os as os, COUNT(*) as count ${baseWhere} AND v.os IS NOT NULL GROUP BY v.os ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT v.country as country, COUNT(*) as count ${baseWhere} AND v.country IS NOT NULL GROUP BY v.country ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT v.referrer as referrer, COUNT(*) as count ${baseWhere} AND v.referrer IS NOT NULL AND v.referrer != '' GROUP BY v.referrer ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT ${hourExpr} as hour, COUNT(*) as total, SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN v.was_blocked = 0 THEN 1 ELSE 0 END) as allowed ${baseWhere} GROUP BY hour ORDER BY hour DESC LIMIT 24`, params),
      db.all(`SELECT v.block_reason as block_reason, COUNT(*) as count ${baseWhere} AND v.was_blocked = 1 AND v.block_reason IS NOT NULL GROUP BY v.block_reason ORDER BY count DESC`, params),
      db.all(`SELECT v.site_id as site_id, COUNT(*) as count FROM visitors v WHERE v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?) AND v.created_at >= ? AND v.created_at < ? GROUP BY v.site_id ORDER BY count DESC`, [userId, start, end])
    ]);

    return {
      total: num(agg?.total),
      blocked: num(agg?.blocked),
      allowed: num(agg?.allowed),
      bots: num(agg?.bots),
      mobile: num(agg?.mobile),
      desktop: num(agg?.desktop),
      byBrowser: byBrowser || [],
      byOS: byOS || [],
      byCountry: byCountry || [],
      byReferrer: byReferrer || [],
      byHour: byHour || [],
      blockReasons: blockReasons || [],
      bySite: bySite || []
    };
  }

  async function getAnalyticsForUser(userId, period = '7d', siteId = null) {
    const { start, end } = getBrasiliaDateRange(period);
    const siteFilter = siteId && siteId !== 'all' ? ' AND v.site_id = ?' : '';
    const params = siteId && siteId !== 'all' ? [start, end, userId, siteId] : [start, end, userId];
    const baseWhere = `v.created_at >= ? AND v.created_at < ? AND v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?)${siteFilter}`;
    const hourExpr = db.usePg ? "to_char(date_trunc('hour', v.created_at), 'YYYY-MM-DD HH24:00')" : "strftime('%Y-%m-%d %H:00', v.created_at)";

    const [
      byUserAgentBlocked,
      byBlockReason,
      byIp,
      byReferrer,
      timeline,
      suspectedReviewers,
      topBots
    ] = await Promise.all([
      db.all(`SELECT v.user_agent as ua, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.user_agent IS NOT NULL GROUP BY v.user_agent ORDER BY c DESC LIMIT 30`, params),
      db.all(`SELECT v.block_reason as reason, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.block_reason IS NOT NULL GROUP BY v.block_reason ORDER BY c DESC`, params),
      db.all(`SELECT v.ip as ip, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.ip != 'unknown' GROUP BY v.ip ORDER BY c DESC LIMIT 20`, params),
      db.all(`SELECT v.referrer as ref, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.referrer IS NOT NULL AND v.referrer != '' GROUP BY v.referrer ORDER BY c DESC LIMIT 15`, params),
      db.all(`SELECT ${hourExpr} as h, COUNT(*) as total, SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN v.is_suspected_reviewer = 1 THEN 1 ELSE 0 END) as reviewers FROM visitors v WHERE ${baseWhere} GROUP BY h ORDER BY h`, params),
      db.all(`SELECT v.ip, v.user_agent, v.referrer, v.block_reason, v.created_at FROM visitors v WHERE ${baseWhere} AND v.is_suspected_reviewer = 1 ORDER BY v.created_at DESC LIMIT 50`, params),
      db.all(`SELECT v.user_agent as ua, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.is_bot = 1 GROUP BY v.user_agent ORDER BY c DESC LIMIT 20`, params)
    ]);

    return {
      byUserAgentBlocked: (byUserAgentBlocked || []).map(r => ({ ua: r.ua, count: r.c })),
      byBlockReason: (byBlockReason || []).map(r => ({ reason: r.reason, count: r.c })),
      byIp: (byIp || []).map(r => ({ ip: r.ip, count: r.c })),
      byReferrer: (byReferrer || []).map(r => ({ ref: r.ref, count: r.c })),
      timeline: timeline || [],
      suspectedReviewers: suspectedReviewers || [],
      topBots: (topBots || []).map(r => ({ ua: r.ua, count: r.c }))
    };
  }

  return { getStatsForUser, getAnalyticsForUser };
}

module.exports = { createMetricsService };
