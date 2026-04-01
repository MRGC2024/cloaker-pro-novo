function createFallbackService(deps) {
  const {
    db,
    usePg,
    panelDomain,
    sendTelegramMessage,
    getGlobalFallbacks
  } = deps;

  const URL_CHECK_TIMEOUT_MS = 20000;
  const CHECK_ATTEMPTS_PER_CYCLE = 3;
  const DELAY_BETWEEN_ATTEMPTS_MS = 5000;
  const FALLBACK_CONFIRM_FAILURES = 5;
  const FINAL_CONFIRM_ATTEMPTS = 2;
  const FALLBACK_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  const upsertSetting = async (key, value) => {
    if (usePg) await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [key, value]);
    else await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value]);
  };

  async function checkUrlReachable(url) {
    if (!url || typeof url !== 'string') return false;
    const u = url.trim();
    if (!u.startsWith('http://') && !u.startsWith('https://')) return false;
    let origin = '';
    try { origin = new URL(u).origin + '/'; } catch (e) {}
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    };
    if (origin) headers['Referer'] = origin;

    const doSingleAttempt = async () => {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), URL_CHECK_TIMEOUT_MS);
      try {
        const res = await fetch(u, { method: 'GET', redirect: 'follow', signal: controller.signal, headers });
        clearTimeout(to);
        return res.status >= 200 && res.status < 400;
      } catch (e) {
        clearTimeout(to);
        return false;
      }
    };

    for (let i = 0; i < CHECK_ATTEMPTS_PER_CYCLE; i++) {
      if (await doSingleAttempt()) return true;
      if (i < CHECK_ATTEMPTS_PER_CYCLE - 1) await new Promise(r => setTimeout(r, DELAY_BETWEEN_ATTEMPTS_MS));
    }
    return false;
  }

  async function finalConfirmationUrlDown(url) {
    for (let i = 0; i < FINAL_CONFIRM_ATTEMPTS; i++) {
      const ok = await checkUrlReachable(url);
      if (ok) return false;
      if (i < FINAL_CONFIRM_ATTEMPTS - 1) await new Promise(r => setTimeout(r, 8000));
    }
    return true;
  }

  async function getFallbackFailCounts() {
    const row = await db.get("SELECT value FROM settings WHERE key = 'fallback_fail_counts'");
    if (!row || !row.value) return {};
    try {
      const o = JSON.parse(row.value);
      return typeof o === 'object' && o !== null ? o : {};
    } catch (e) {
      return {};
    }
  }

  async function setFallbackFailCount(siteId, count) {
    const counts = await getFallbackFailCounts();
    if (count === 0) delete counts[siteId];
    else counts[siteId] = count;
    await upsertSetting('fallback_fail_counts', JSON.stringify(counts));
  }

  async function getFallbackFailCount(siteId) {
    const counts = await getFallbackFailCounts();
    return counts[siteId] || 0;
  }

  async function getFallbackAlertCooldowns() {
    const row = await db.get("SELECT value FROM settings WHERE key = 'fallback_alert_cooldown'");
    if (!row || !row.value) return {};
    try {
      const o = JSON.parse(row.value);
      return typeof o === 'object' && o !== null ? o : {};
    } catch (e) {
      return {};
    }
  }

  async function setFallbackAlertCooldown(siteId) {
    const cooldowns = await getFallbackAlertCooldowns();
    cooldowns[siteId] = Date.now();
    await upsertSetting('fallback_alert_cooldown', JSON.stringify(cooldowns));
  }

  async function canSendFallbackAlert(siteId) {
    const cooldowns = await getFallbackAlertCooldowns();
    const last = cooldowns[siteId];
    if (!last) return true;
    return (Date.now() - last) >= FALLBACK_ALERT_COOLDOWN_MS;
  }

  async function clearFallbackAlertCooldown(siteId) {
    const cooldowns = await getFallbackAlertCooldowns();
    delete cooldowns[siteId];
    await upsertSetting('fallback_alert_cooldown', JSON.stringify(cooldowns));
  }

  async function runFallbackHealthCheck() {
    try {
      const sites = await db.all(`
        SELECT site_id, name, link_code, target_url, fallback_override_url, selected_domain, use_fallback, path_prefix
        FROM sites
        WHERE is_active = 1 AND (target_url IS NOT NULL AND target_url != '')
      `);
      for (const site of sites) {
        const useFallback = site.use_fallback !== 0 && site.use_fallback !== false;
        if (!useFallback) { await setFallbackFailCount(site.site_id, 0); continue; }

        const primary = (site.target_url || '').trim();
        const override = (site.fallback_override_url || '').trim();

        if (override && primary) {
          const primaryOk = await checkUrlReachable(primary);
          if (primaryOk) {
            await db.run('UPDATE sites SET fallback_override_url = NULL WHERE site_id = ?', [site.site_id]);
            await setFallbackFailCount(site.site_id, 0);
            await clearFallbackAlertCooldown(site.site_id);
            await sendTelegramMessage(
              `✅ <b>Site recuperado – contingência removida</b>\n\n` +
              `Site: <b>${(site.name || site.site_id || '').replace(/</g, '&lt;')}</b>\n` +
              `URL principal voltou a responder:\n<code>${primary.replace(/</g, '&lt;')}</code>\n` +
              `\nO sistema voltou automaticamente para a URL principal.`
            );
            continue;
          }
        }

        const currentUrl = override || primary;
        if (!currentUrl) continue;
        const ok = await checkUrlReachable(currentUrl);
        if (ok) { await setFallbackFailCount(site.site_id, 0); continue; }

        const failCount = (await getFallbackFailCount(site.site_id)) + 1;
        await setFallbackFailCount(site.site_id, failCount);
        if (failCount < FALLBACK_CONFIRM_FAILURES) continue;

        if (!(await finalConfirmationUrlDown(currentUrl))) {
          await setFallbackFailCount(site.site_id, 0);
          continue;
        }

        const fallbacks = await getGlobalFallbacks();
        let found = null;
        for (const furl of fallbacks) {
          const u = (furl || '').trim();
          if (!u) continue;
          if (await checkUrlReachable(u)) { found = u; break; }
        }

        if (found) {
          await setFallbackFailCount(site.site_id, 0);
          const prevOverride = override || primary;
          const isNewSwitch = prevOverride !== found;
          await db.run('UPDATE sites SET fallback_override_url = ? WHERE site_id = ?', [found, site.site_id]);
          if (isNewSwitch && (await canSendFallbackAlert(site.site_id))) {
            await setFallbackAlertCooldown(site.site_id);
            const base = site.selected_domain ? `https://${site.selected_domain}` : (panelDomain ? `https://${panelDomain}` : '');
            const pathSeg = (site.path_prefix || 'go').trim() || 'go';
            const linkSuffix = base ? `${base}/${pathSeg}/${site.link_code}` : `/${pathSeg}/${site.link_code}`;
            await sendTelegramMessage(
              `⚠️ <b>Site offline – Fallback ativado</b>\n\n` +
              `Site: <b>${(site.name || site.site_id || '').replace(/</g, '&lt;')}</b>\n` +
              `❌ URL que caiu: <code>${prevOverride.replace(/</g, '&lt;')}</code>\n` +
              `✅ Novo link em uso: <code>${found.replace(/</g, '&lt;')}</code>\n` +
              (base ? `Link do painel: ${linkSuffix}\n` : '') +
              `\nO sistema trocou automaticamente. Não enviará novo aviso por 24 h (mesmo site).`
            );
          }
        } else {
          await setFallbackFailCount(site.site_id, 0);
          if (!override && failCount === FALLBACK_CONFIRM_FAILURES && (await canSendFallbackAlert(site.site_id))) {
            await setFallbackAlertCooldown(site.site_id);
            await sendTelegramMessage(
              `🚨 <b>Site offline – sem fallback disponível</b>\n\n` +
              `Site: <b>${(site.name || site.site_id || '').replace(/</g, '&lt;')}</b>\n` +
              `URL offline: <code>${currentUrl.replace(/</g, '&lt;')}</code>\n` +
              `\nConfigure URLs de contingência no painel. Próximo aviso só em 24 h (mesmo site).`
            );
          }
        }
      }
    } catch (e) {
      console.error('Fallback health check error:', e.message);
    }
  }

  return { runFallbackHealthCheck };
}

module.exports = { createFallbackService };
