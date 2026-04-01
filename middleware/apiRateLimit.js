function createApiRateLimit(options = {}) {
  const windowMs = Number(options.windowMs || 60_000);
  const max = Number(options.max || 240);
  const store = new Map();

  function keyFromReq(req) {
    const ip = (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').toString().split(',')[0].trim();
    const uid = req.session && req.session.userId ? `u:${req.session.userId}` : '';
    return uid ? `${uid}|${ip}` : `ip:${ip}`;
  }

  return function apiRateLimit(req, res, next) {
    if (!req.path.startsWith('/api/')) return next();
    if (req.path === '/api/track') return next(); // rota já tem regras próprias
    if (req.path === '/api/login') return next(); // não bloquear tentativa de login no middleware global

    const now = Date.now();
    const key = keyFromReq(req);
    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      const retrySec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({ error: 'Muitas requisições. Tente novamente em instantes.' });
    }
    return next();
  };
}

module.exports = { createApiRateLimit };
