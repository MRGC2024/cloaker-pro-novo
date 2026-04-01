function normalizeCountryCsv(value) {
  if (value == null) return '';
  const unique = new Set(
    String(value)
      .split(',')
      .map(v => v.trim().toUpperCase())
      .filter(v => /^[A-Z]{2}$/.test(v))
  );
  return Array.from(unique).join(',');
}

function normalizeAllowedBlockedCountries(allowed, blocked) {
  const allowedNorm = normalizeCountryCsv(allowed) || 'BR';
  const blockedNorm = normalizeCountryCsv(blocked);
  const allowedSet = new Set(allowedNorm.split(',').filter(Boolean));
  const blockedFiltered = blockedNorm
    .split(',')
    .filter(Boolean)
    .filter(code => !allowedSet.has(code))
    .join(',');
  return { allowed: allowedNorm, blocked: blockedFiltered };
}

module.exports = { normalizeCountryCsv, normalizeAllowedBlockedCountries };
