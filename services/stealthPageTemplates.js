/**
 * Modelos HTML profissionais para funil Stealth (white / gray / oferta).
 * Cada geração sorteia textos únicos — ver stealthPageVariations.js
 */

const { composePageData, uniquePackId } = require('./stealthPageVariations');

function formatPackStamp(d = new Date()) {
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function shortHeadline(text, max = 46) {
  const t = String(text || '').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function stealthPageName(role, headline, stamp, packId) {
  return `[Stealth] ${role} · ${shortHeadline(headline)} · ${stamp} · #${packId}`;
}

const THEMES = {
  'bem-estar': {
    label: 'Saúde e bem-estar',
    accent: '#0f766e',
    accentLight: '#14b8a6',
    accentSoft: '#f0fdfa',
    accentMuted: '#99f6e4'
  },
  financas: {
    label: 'Finanças e organização',
    accent: '#1d4ed8',
    accentLight: '#3b82f6',
    accentSoft: '#eff6ff',
    accentMuted: '#bfdbfe'
  },
  geral: {
    label: 'Conteúdo geral',
    accent: '#4f46e5',
    accentLight: '#6366f1',
    accentSoft: '#eef2ff',
    accentMuted: '#c7d2fe'
  },
  'central-leituras': {
    label: 'Central de Leituras (editorial)',
    defaultBrand: 'Central de Leituras',
    accent: '#7c3aed',
    accentLight: '#8b5cf6',
    accentSoft: '#f5f3ff',
    accentMuted: '#ddd6fe'
  }
};

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function proStyles(t) {
  const { accent, accentLight, accentSoft, accentMuted } = t;
  return `
    :root {
      --accent: ${accent};
      --accent-light: ${accentLight};
      --accent-soft: ${accentSoft};
      --accent-muted: ${accentMuted};
      --text: #0f172a;
      --text-secondary: #475569;
      --text-muted: #94a3b8;
      --border: #e2e8f0;
      --bg: #ffffff;
      --bg-subtle: #f8fafc;
      --shadow: 0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.04);
      --radius: 12px;
      --radius-lg: 16px;
      --font: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font); background: var(--bg-subtle); color: var(--text); line-height: 1.65; -webkit-font-smoothing: antialiased; }
    .topbar { background: rgba(255,255,255,0.92); border-bottom: 1px solid var(--border); padding: 14px 0; position: sticky; top: 0; z-index: 10; backdrop-filter: blur(8px); }
    .container { max-width: 760px; margin: 0 auto; padding: 0 24px; }
    .container-wide { max-width: 960px; margin: 0 auto; padding: 0 24px; }
    .topbar-inner { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .topbar-tag { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    .hero { background: linear-gradient(165deg, var(--accent-soft) 0%, var(--bg) 55%); padding: 48px 0 40px; border-bottom: 1px solid var(--border); }
    .hero-offer { padding: 56px 0 48px; }
    .category { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); padding: 5px 12px; border-radius: 999px; margin-bottom: 16px; }
    .badge-offer { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; background: var(--accent); padding: 6px 14px; border-radius: 999px; margin-bottom: 18px; }
    h1 { font-size: clamp(1.75rem, 4vw, 2.35rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.03em; margin-bottom: 16px; }
    .lead { font-size: 1.125rem; color: var(--text-secondary); line-height: 1.7; max-width: 640px; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 24px; font-size: 13px; color: var(--text-muted); }
    .meta-dot::before { content: '·'; margin-right: 4px; }
    .content { padding: 40px 0 48px; }
    .content article { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 36px 32px; box-shadow: var(--shadow); }
    h2 { font-size: 1.2rem; font-weight: 700; margin: 32px 0 10px; }
    h2:first-child { margin-top: 0; }
    p { margin-bottom: 16px; color: var(--text-secondary); }
    .highlights { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border); }
    .pill { font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-soft); padding: 6px 14px; border-radius: 999px; }
    .disclaimer { background: var(--accent-soft); border-left: 3px solid var(--accent); padding: 16px 18px; border-radius: 0 var(--radius) var(--radius) 0; margin-top: 28px; font-size: 0.9rem; color: var(--text-secondary); }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 32px 0; }
    .feature-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px 20px; box-shadow: var(--shadow); }
    .feature-num { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: var(--accent-soft); color: var(--accent); font-size: 13px; font-weight: 800; border-radius: 10px; margin-bottom: 14px; }
    .feature-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; }
    .feature-card p { font-size: 0.9rem; margin: 0; color: var(--text-secondary); }
    .benefits { list-style: none; margin: 24px 0; }
    .benefits li { position: relative; padding: 10px 0 10px 28px; color: var(--text-secondary); font-size: 0.95rem; border-bottom: 1px solid var(--border); }
    .benefits li:last-child { border-bottom: none; }
    .benefits li::before { content: ''; position: absolute; left: 0; top: 16px; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; }
    .faq-item { border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 10px; overflow: hidden; }
    .faq-q { padding: 16px 20px; font-weight: 700; font-size: 0.95rem; background: var(--bg-subtle); }
    .faq-a { padding: 14px 20px 18px; font-size: 0.9rem; color: var(--text-secondary); }
    .trust-bar { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; padding: 28px 0; border-top: 1px solid var(--border); }
    .trust-num { font-size: 1.5rem; font-weight: 800; color: var(--accent); }
    .trust-label { font-size: 12px; color: var(--text-muted); }
    footer { background: var(--bg); border-top: 1px solid var(--border); padding: 28px 0; }
    .footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; font-size: 13px; color: var(--text-muted); }
    .footer-links a { color: var(--text-muted); text-decoration: none; margin-left: 16px; }
    @media (max-width: 600px) { .container, .container-wide { padding: 0 18px; } .content article { padding: 24px 20px; } .features { grid-template-columns: 1fr; } }
  `;
}

function wrapHtml(title, body, styles) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${esc(title)}</title>
  <style>${styles}</style>
</head>
<body>${body}</body>
</html>`;
}

function footerHtml(brand, year) {
  return `<footer><div class="container footer-inner">
    <div>© ${year} ${esc(brand)} · Todos os direitos reservados</div>
    <div class="footer-links"><a href="#">Privacidade</a><a href="#">Termos</a><a href="#">Contato</a></div>
  </div></footer>`;
}

function buildEditorialPage(t, pageData, opts, pageType) {
  const brand = esc(opts.brandName || (pageType === 'white' ? 'Revista Digital' : 'Central de Conteúdo'));
  const year = new Date().getFullYear();
  const sections = (pageData.sections || []).map((s) => `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('');
  const pills = (pageData.highlights || []).map((h) => `<span class="pill">${esc(h)}</span>`).join('');
  const body = `
  <div class="topbar"><div class="container topbar-inner">
    <div class="logo">${brand}</div>
    <div class="topbar-tag">${esc(pageData.category)}</div>
  </div></div>
  <section class="hero"><div class="container">
    <span class="category">${esc(pageData.category)}</span>
    <h1>${esc(pageData.title)}</h1>
    <p class="lead">${esc(pageData.lead)}</p>
    <div class="meta"><span>${esc(pageData.readTime)}</span><span class="meta-dot">Atualizado em ${year}</span></div>
  </div></section>
  <section class="content"><div class="container"><article>
    ${sections}
    <div class="disclaimer">Conteúdo informativo e editorial. Não substitui orientação profissional especializada.</div>
    <div class="highlights">${pills}</div>
  </article></div></section>
  ${footerHtml(brand, year)}`;
  return wrapHtml(pageData.title, body, proStyles(t));
}

function buildWhitePage(themeKey, opts = {}, pageData) {
  const t = THEMES[themeKey] || THEMES.geral;
  return buildEditorialPage(t, pageData || composePageData(themeKey, 'white'), opts, 'white');
}

function buildGrayPage(themeKey, opts = {}, pageData) {
  const t = THEMES[themeKey] || THEMES.geral;
  return buildEditorialPage(t, pageData || composePageData(themeKey, 'gray'), opts, 'gray');
}

function buildOfferPage(themeKey, opts = {}, pageData) {
  const t = THEMES[themeKey] || THEMES.geral;
  const o = pageData || composePageData(themeKey, 'offer');
  const brand = esc(opts.brandName || 'Acesso Exclusivo');
  const product = esc(opts.productName || o.title);
  const year = new Date().getFullYear();
  const features = (o.features || []).map((f) => `
    <div class="feature-card">
      <div class="feature-num">${esc(f.icon)}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.desc)}</p>
    </div>`).join('');
  const bullets = (o.bullets || []).map((b) => `<li>${esc(b)}</li>`).join('');
  const faq = (o.faq || []).map((item) => `
    <div class="faq-item">
      <div class="faq-q">${esc(item.q)}</div>
      <div class="faq-a">${esc(item.a)}</div>
    </div>`).join('');
  const trust = o.trustBar || [
    { num: '100%', label: 'Conteúdo digital' },
    { num: '24/7', label: 'Acesso imediato' },
    { num: '+', label: 'Atualizações' }
  ];
  const trustHtml = trust.map((x) => `
    <div class="trust-item"><div class="trust-num">${esc(x.num)}</div><div class="trust-label">${esc(x.label)}</div></div>`).join('');
  const body = `
  <div class="topbar"><div class="container-wide topbar-inner">
    <div class="logo">${brand}</div>
    <div class="topbar-tag">Material exclusivo</div>
  </div></div>
  <section class="hero hero-offer"><div class="container-wide">
    <span class="badge-offer">${esc(o.badge)}</span>
    <h1>${product}</h1>
    <p class="lead">${esc(o.lead)}</p>
  </div></section>
  <section class="content"><div class="container-wide">
    <div class="features">${features}</div>
    <article style="margin-top:24px">
      <h2 style="margin-top:0">O que está incluído</h2>
      <ul class="benefits">${bullets}</ul>
      <div class="trust-bar">${trustHtml}</div>
    </article>
    <div style="margin-top:32px"><h2 style="margin-bottom:16px;font-size:1.1rem">Perguntas frequentes</h2>${faq}</div>
    <div class="disclaimer" style="margin-top:28px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg);border-left:none">
      Material digital para consulta e estudo. Resultados variam conforme dedicação e contexto individual.
    </div>
  </div></section>
  ${footerHtml(brand, year)}`;
  return wrapHtml(product, body, proStyles(t));
}

function getStealthPagePack(themeKey = 'geral', opts = {}) {
  const key = THEMES[themeKey] ? themeKey : 'geral';
  const packId = opts.suffix || uniquePackId();
  const generatedAt = formatPackStamp();
  const mergedOpts = { ...opts };
  if (!mergedOpts.brandName && THEMES[key].defaultBrand) {
    mergedOpts.brandName = THEMES[key].defaultBrand;
  }
  const label = THEMES[key].label;
  const whiteData = composePageData(key, 'white');
  const grayData = composePageData(key, 'gray');
  const offerData = composePageData(key, 'offer');
  const offerHeadline = mergedOpts.productName || offerData.title;
  return {
    theme: key,
    themeLabel: label,
    packId,
    generatedAt,
    titles: {
      white: whiteData.title,
      gray: grayData.title,
      offer: offerHeadline
    },
    pages: [
      {
        role: 'white',
        name: stealthPageName('White', whiteData.title, generatedAt, packId),
        html_content: buildWhitePage(key, mergedOpts, whiteData)
      },
      {
        role: 'gray',
        name: stealthPageName('Gray', grayData.title, generatedAt, packId),
        html_content: buildGrayPage(key, mergedOpts, grayData)
      },
      {
        role: 'offer',
        name: stealthPageName('Oferta', offerHeadline, generatedAt, packId),
        html_content: buildOfferPage(key, mergedOpts, offerData)
      }
    ]
  };
}

function listStealthThemes() {
  return Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label }));
}

module.exports = { getStealthPagePack, listStealthThemes, THEMES };
