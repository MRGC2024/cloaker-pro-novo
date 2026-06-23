function createMetricsService(deps) {
  const { db, getBrasiliaDateRange } = deps;

  const num = (v) => (v == null || v === '' ? 0 : Number(v)) || 0;
  const pct = (part, total) => (total > 0 ? Math.round((part / total) * 1000) / 10 : 0);

  function getPreviousPeriodRange(period) {
    const { start, end } = getBrasiliaDateRange(period);
    const toMs = (s) => new Date(s.replace(' ', 'T') + 'Z').getTime();
    const startMs = toMs(start);
    const endMs = toMs(end);
    const span = endMs - startMs;
    const fmt = (ms) => {
      const d = new Date(ms);
      const y = d.getUTCFullYear();
      const m = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const h = String(d.getUTCHours()).padStart(2, '0');
      const min = String(d.getUTCMinutes()).padStart(2, '0');
      const s = String(d.getUTCSeconds()).padStart(2, '0');
      return `${y}-${m}-${day} ${h}:${min}:${s}`;
    };
    return { start: fmt(startMs - span), end: fmt(endMs - span) };
  }

  const fbReferrerCond = `(LOWER(v.referrer) LIKE '%facebook.com%' OR LOWER(v.referrer) LIKE '%fb.com%' OR LOWER(v.referrer) LIKE '%fb.me%' OR LOWER(v.referrer) LIKE '%instagram.com%')`;
  const fbclidCond = `(v.facebook_params IS NOT NULL AND v.facebook_params != '' AND v.facebook_params != '{}' AND v.facebook_params LIKE '%fbclid%')`;
  const fbUtmCond = `(LOWER(v.utm_source) IN ('fb', 'facebook') OR v.utm_source = 'FB')`;

  async function getStatsForUser(userId, period = 'today', siteId = null) {
    const { start, end } = getBrasiliaDateRange(period);
    const prev = getPreviousPeriodRange(period);
    const userSites = 'v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?)';
    const siteFilter = siteId && siteId !== 'all' ? ' AND v.site_id = ?' : '';
    const params = siteId && siteId !== 'all' ? [start, end, userId, siteId] : [start, end, userId];
    const prevParams = siteId && siteId !== 'all' ? [prev.start, prev.end, userId, siteId] : [prev.start, prev.end, userId];
    const baseWhere = `FROM visitors v WHERE v.created_at >= ? AND v.created_at < ? AND ${userSites}${siteFilter}`;
    const hourExpr = db.usePg ? "to_char(date_trunc('hour', v.created_at), 'YYYY-MM-DD HH24:00')" : "strftime('%Y-%m-%d %H:00', v.created_at)";
    const dayExpr = db.usePg ? "to_char(date_trunc('day', v.created_at), 'YYYY-MM-DD')" : "strftime('%Y-%m-%d', v.created_at)";
    const dayLimit = period === '30d' ? 31 : period === '15d' ? 16 : period === '7d' ? 8 : 31;

    const [
      agg, metaAgg, prevAgg,
      byBrowser, byOS, byCountry, byReferrer, byHour, byDay, blockReasons, bySite
    ] = await Promise.all([
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
      db.get(
        `SELECT SUM(CASE WHEN ${fbclidCond} THEN 1 ELSE 0 END) as with_fbclid,
                SUM(CASE WHEN ${fbReferrerCond} THEN 1 ELSE 0 END) as fb_referrer,
                SUM(CASE WHEN ${fbUtmCond} THEN 1 ELSE 0 END) as fb_utm,
                SUM(CASE WHEN v.is_suspected_reviewer = 1 THEN 1 ELSE 0 END) as reviewers,
                SUM(CASE WHEN (${fbclidCond} OR ${fbReferrerCond} OR ${fbUtmCond}) AND v.was_blocked = 0 THEN 1 ELSE 0 END) as meta_allowed,
                SUM(CASE WHEN (${fbclidCond} OR ${fbReferrerCond} OR ${fbUtmCond}) AND v.was_blocked = 1 THEN 1 ELSE 0 END) as meta_blocked
         ${baseWhere}`,
        params
      ),
      db.get(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked,
                SUM(CASE WHEN v.was_blocked = 0 THEN 1 ELSE 0 END) as allowed
         FROM visitors v WHERE v.created_at >= ? AND v.created_at < ? AND ${userSites}${siteFilter}`,
        prevParams
      ),
      db.all(`SELECT v.browser as browser, COUNT(*) as count ${baseWhere} AND v.browser IS NOT NULL GROUP BY v.browser ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT v.os as os, COUNT(*) as count ${baseWhere} AND v.os IS NOT NULL GROUP BY v.os ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT v.country as country, COUNT(*) as count ${baseWhere} AND v.country IS NOT NULL GROUP BY v.country ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT v.referrer as referrer, COUNT(*) as count ${baseWhere} AND v.referrer IS NOT NULL AND v.referrer != '' GROUP BY v.referrer ORDER BY count DESC LIMIT 10`, params),
      db.all(`SELECT ${hourExpr} as hour, COUNT(*) as total, SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN v.was_blocked = 0 THEN 1 ELSE 0 END) as allowed ${baseWhere} GROUP BY hour ORDER BY hour DESC LIMIT 24`, params),
      db.all(`SELECT ${dayExpr} as day, COUNT(*) as total, SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN v.was_blocked = 0 THEN 1 ELSE 0 END) as allowed ${baseWhere} GROUP BY day ORDER BY day ASC LIMIT ${dayLimit}`, params),
      db.all(`SELECT v.block_reason as block_reason, COUNT(*) as count ${baseWhere} AND v.was_blocked = 1 AND v.block_reason IS NOT NULL GROUP BY v.block_reason ORDER BY count DESC`, params),
      db.all(
        `SELECT v.site_id as site_id, COUNT(*) as count,
                SUM(CASE WHEN v.was_blocked = 0 THEN 1 ELSE 0 END) as allowed,
                SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked
         FROM visitors v WHERE v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?) AND v.created_at >= ? AND v.created_at < ?
         GROUP BY v.site_id ORDER BY count DESC`,
        [userId, start, end]
      )
    ]);

    const total = num(agg?.total);
    const allowed = num(agg?.allowed);
    const blocked = num(agg?.blocked);
    const bots = num(agg?.bots);
    const prevTotal = num(prevAgg?.total);
    const prevAllowed = num(prevAgg?.allowed);
    const prevBlocked = num(prevAgg?.blocked);

    return {
      total,
      blocked,
      allowed,
      bots,
      mobile: num(agg?.mobile),
      desktop: num(agg?.desktop),
      rates: {
        allowedPct: pct(allowed, total),
        blockedPct: pct(blocked, total),
        botPct: pct(bots, total),
        mobilePct: pct(num(agg?.mobile), total),
        desktopPct: pct(num(agg?.desktop), total)
      },
      compare: {
        total: prevTotal,
        allowed: prevAllowed,
        blocked: prevBlocked,
        totalDelta: total - prevTotal,
        allowedDelta: allowed - prevAllowed,
        blockedDelta: blocked - prevBlocked,
        allowedPctDelta: pct(allowed, total) - pct(prevAllowed, prevTotal),
        blockedPctDelta: pct(blocked, total) - pct(prevBlocked, prevTotal)
      },
      meta: {
        withFbclid: num(metaAgg?.with_fbclid),
        fbReferrer: num(metaAgg?.fb_referrer),
        fbUtm: num(metaAgg?.fb_utm),
        reviewers: num(metaAgg?.reviewers),
        metaTraffic: num(metaAgg?.meta_allowed) + num(metaAgg?.meta_blocked),
        metaAllowed: num(metaAgg?.meta_allowed),
        metaBlocked: num(metaAgg?.meta_blocked),
        metaAllowedPct: pct(num(metaAgg?.meta_allowed), num(metaAgg?.meta_allowed) + num(metaAgg?.meta_blocked))
      },
      byBrowser: byBrowser || [],
      byOS: byOS || [],
      byCountry: byCountry || [],
      byReferrer: byReferrer || [],
      byHour: byHour || [],
      byDay: byDay || [],
      blockReasons: blockReasons || [],
      bySite: (bySite || []).map((r) => ({
        site_id: r.site_id,
        count: num(r.count),
        allowed: num(r.allowed),
        blocked: num(r.blocked),
        allowedPct: pct(num(r.allowed), num(r.count))
      }))
    };
  }

  async function getAnalyticsForUser(userId, period = '7d', siteId = null) {
    const { start, end } = getBrasiliaDateRange(period);
    const siteFilter = siteId && siteId !== 'all' ? ' AND v.site_id = ?' : '';
    const params = siteId && siteId !== 'all' ? [start, end, userId, siteId] : [start, end, userId];
    const baseWhere = `v.created_at >= ? AND v.created_at < ? AND v.site_id IN (SELECT site_id FROM sites WHERE user_id = ?)${siteFilter}`;
    const hourExpr = db.usePg ? "to_char(date_trunc('hour', v.created_at), 'YYYY-MM-DD HH24:00')" : "strftime('%Y-%m-%d %H:00', v.created_at)";
    const dayExpr = db.usePg ? "to_char(date_trunc('day', v.created_at), 'YYYY-MM-DD')" : "strftime('%Y-%m-%d', v.created_at)";
    const useDayTimeline = ['7d', '15d', '30d'].includes(period);
    const timelineExpr = useDayTimeline ? dayExpr : hourExpr;
    const timelineAlias = useDayTimeline ? 'day' : 'h';

    const [
      byUserAgentBlocked,
      byBlockReason,
      byIp,
      byReferrer,
      timeline,
      suspectedReviewers,
      topBots,
      metaAgg
    ] = await Promise.all([
      db.all(`SELECT v.user_agent as ua, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.user_agent IS NOT NULL GROUP BY v.user_agent ORDER BY c DESC LIMIT 30`, params),
      db.all(`SELECT v.block_reason as reason, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.block_reason IS NOT NULL GROUP BY v.block_reason ORDER BY c DESC`, params),
      db.all(`SELECT v.ip as ip, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.was_blocked = 1 AND v.ip != 'unknown' GROUP BY v.ip ORDER BY c DESC LIMIT 20`, params),
      db.all(`SELECT v.referrer as ref, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.referrer IS NOT NULL AND v.referrer != '' GROUP BY v.referrer ORDER BY c DESC LIMIT 15`, params),
      db.all(`SELECT ${timelineExpr} as ${timelineAlias}, COUNT(*) as total, SUM(CASE WHEN v.was_blocked = 1 THEN 1 ELSE 0 END) as blocked, SUM(CASE WHEN v.is_suspected_reviewer = 1 THEN 1 ELSE 0 END) as reviewers FROM visitors v WHERE ${baseWhere} GROUP BY ${timelineAlias} ORDER BY ${timelineAlias}`, params),
      db.all(`SELECT v.ip, v.user_agent, v.referrer, v.block_reason, v.created_at FROM visitors v WHERE ${baseWhere} AND v.is_suspected_reviewer = 1 ORDER BY v.created_at DESC LIMIT 50`, params),
      db.all(`SELECT v.user_agent as ua, COUNT(*) as c FROM visitors v WHERE ${baseWhere} AND v.is_bot = 1 GROUP BY v.user_agent ORDER BY c DESC LIMIT 20`, params),
      db.get(
        `SELECT SUM(CASE WHEN ${fbclidCond} THEN 1 ELSE 0 END) as with_fbclid,
                SUM(CASE WHEN ${fbReferrerCond} THEN 1 ELSE 0 END) as fb_referrer,
                SUM(CASE WHEN v.is_suspected_reviewer = 1 THEN 1 ELSE 0 END) as reviewers,
                COUNT(*) as total
         FROM visitors v WHERE ${baseWhere}`,
        params
      )
    ]);

    const metaTotal = num(metaAgg?.total);
    return {
      byUserAgentBlocked: (byUserAgentBlocked || []).map((r) => ({ ua: r.ua, count: r.c })),
      byBlockReason: (byBlockReason || []).map((r) => ({ reason: r.reason, count: r.c })),
      byIp: (byIp || []).map((r) => ({ ip: r.ip, count: r.c })),
      byReferrer: (byReferrer || []).map((r) => ({ ref: r.ref, count: r.c })),
      timeline: (timeline || []).map((r) => ({
        label: r[timelineAlias] || r.h || r.day,
        total: num(r.total),
        blocked: num(r.blocked),
        reviewers: num(r.reviewers)
      })),
      timelineGranularity: useDayTimeline ? 'day' : 'hour',
      suspectedReviewers: suspectedReviewers || [],
      topBots: (topBots || []).map((r) => ({ ua: r.ua, count: r.c })),
      meta: {
        withFbclid: num(metaAgg?.with_fbclid),
        fbReferrer: num(metaAgg?.fb_referrer),
        reviewers: num(metaAgg?.reviewers),
        fbclidPct: pct(num(metaAgg?.with_fbclid), metaTotal),
        reviewerPct: pct(num(metaAgg?.reviewers), metaTotal)
      }
    };
  }

  return { getStatsForUser, getAnalyticsForUser };
}

module.exports = { createMetricsService };
