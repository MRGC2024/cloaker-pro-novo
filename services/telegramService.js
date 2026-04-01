function createTelegramService(deps) {
  const { db, usePg, prefix } = deps;

  async function upsertSetting(key, value) {
    const v = value != null ? String(value).trim() : '';
    if (usePg) await db.run("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value", [key, v]);
    else await db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, v]);
  }

  async function getTelegramConfig() {
    const tokenRow = await db.get("SELECT value FROM settings WHERE key = 'telegram_bot_token'");
    const chatRow = await db.get("SELECT value FROM settings WHERE key = 'telegram_chat_id'");
    const token = (tokenRow?.value || process.env.TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (chatRow?.value || process.env.TELEGRAM_CHAT_ID || '').trim();
    return { token, chatId };
  }

  async function sendTelegramMessage(text) {
    const { token, chatId } = await getTelegramConfig();
    if (!token || !chatId) return;
    const fullText = prefix + text + '\n\n— <i>Notificação enviada pelo Painel Cloaker</i>';
    try {
      const u = `https://api.telegram.org/bot${token}/sendMessage`;
      await fetch(u, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: fullText, parse_mode: 'HTML', disable_web_page_preview: true })
      });
    } catch (e) {
      console.error('Telegram send error:', e.message);
    }
  }

  async function getGlobalFallbacks() {
    const row = await db.get("SELECT value FROM settings WHERE key = 'global_fallbacks'");
    if (!row || !row.value) return [];
    try {
      const arr = JSON.parse(row.value);
      return Array.isArray(arr) ? arr.filter(u => u && typeof u === 'string' && (u.startsWith('http://') || u.startsWith('https://'))) : [];
    } catch (e) {
      return [];
    }
  }

  async function getDailyLinkReportMeta() {
    const row = await db.get("SELECT value FROM settings WHERE key = 'daily_link_report_meta'");
    if (!row || !row.value) return {};
    try {
      const meta = JSON.parse(row.value);
      return (meta && typeof meta === 'object') ? meta : {};
    } catch (e) {
      return {};
    }
  }

  async function setDailyLinkReportMeta(meta) {
    await upsertSetting('daily_link_report_meta', JSON.stringify(meta || {}));
  }

  async function getDailyLinkReportHourBr(defaultHour) {
    const row = await db.get("SELECT value FROM settings WHERE key = 'daily_link_report_hour_br'");
    const fromDb = parseInt((row && row.value) ? String(row.value).trim() : '', 10);
    if (!Number.isNaN(fromDb) && fromDb >= 0 && fromDb <= 23) return fromDb;
    return defaultHour;
  }

  return {
    upsertSetting,
    getTelegramConfig,
    sendTelegramMessage,
    getGlobalFallbacks,
    getDailyLinkReportMeta,
    setDailyLinkReportMeta,
    getDailyLinkReportHourBr
  };
}

module.exports = { createTelegramService };
