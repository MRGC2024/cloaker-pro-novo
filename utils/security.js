function parseAllowedOrigins() {
  const raw = (process.env.CORS_ORIGINS || '').trim();
  if (!raw) return null; // fallback liberado (modo legado)
  const set = new Set(
    raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
  );
  return set.size > 0 ? set : null;
}

function corsOriginResolver(allowedSet) {
  if (!allowedSet) return true;
  return function(origin, cb) {
    // requests same-origin/server-to-server podem vir sem header Origin
    if (!origin) return cb(null, true);
    if (allowedSet.has(origin)) return cb(null, true);
    return cb(new Error('CORS origin não permitido'));
  };
}

module.exports = { parseAllowedOrigins, corsOriginResolver };
