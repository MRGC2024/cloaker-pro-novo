/**
 * Modelos HTML profissionais para funil Stealth (white / gray / oferta).
 * Cada geração sorteia textos únicos — ver stealthPageVariations.js
 */

const { composePageData, uniquePackId, pickRandomTheme, pickBrandForTheme } = require('./stealthPageVariations');

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
    brandPool: ['Vida Leve', 'Bem-Estar Diário', 'Rotina Saudável'],
    accent: '#0f766e', accentLight: '#14b8a6', accentSoft: '#f0fdfa', accentMuted: '#99f6e4'
  },
  financas: {
    label: 'Finanças e organização',
    brandPool: ['Clareza Financeira', 'Organize Seu Dinheiro', 'Finanças Simples'],
    accent: '#1d4ed8', accentLight: '#3b82f6', accentSoft: '#eff6ff', accentMuted: '#bfdbfe'
  },
  geral: {
    label: 'Conteúdo geral',
    brandPool: ['Revista Digital', 'Portal Conteúdo', 'Leituras Online'],
    accent: '#4f46e5', accentLight: '#6366f1', accentSoft: '#eef2ff', accentMuted: '#c7d2fe'
  },
  'central-leituras': {
    label: 'Central de Leituras (editorial)',
    defaultBrand: 'Central de Leituras',
    brandPool: ['Central de Leituras', 'Biblioteca Aberta', 'Leituras do Dia'],
    accent: '#7c3aed', accentLight: '#8b5cf6', accentSoft: '#f5f3ff', accentMuted: '#ddd6fe'
  },
  receitas: {
    label: 'Receitas e culinária',
    brandPool: ['Cozinha Simples', 'Receitas do Dia', 'Panela & Fogão'],
    accent: '#c2410c', accentLight: '#ea580c', accentSoft: '#fff7ed', accentMuted: '#fed7aa'
  },
  maternidade: {
    label: 'Família e maternidade',
    brandPool: ['Família em Dia', 'Casa & Filhos', 'Rotina Familiar'],
    accent: '#db2777', accentLight: '#ec4899', accentSoft: '#fdf2f8', accentMuted: '#fbcfe8'
  },
  'casa-jardim': {
    label: 'Casa, decoração e jardim',
    brandPool: ['Casa Acolhedora', 'Jardim Urbano', 'Lar Organizado'],
    accent: '#15803d', accentLight: '#22c55e', accentSoft: '#f0fdf4', accentMuted: '#bbf7d0'
  },
  pets: {
    label: 'Pets e animais',
    brandPool: ['Mundo Pet', 'Cuidados Pet', 'Tutor Informado'],
    accent: '#b45309', accentLight: '#d97706', accentSoft: '#fffbeb', accentMuted: '#fde68a'
  },
  tecnologia: {
    label: 'Tecnologia do dia a dia',
    brandPool: ['Tech Simples', 'Digital Consciente', 'Guia Mobile'],
    accent: '#0369a1', accentLight: '#0ea5e9', accentSoft: '#f0f9ff', accentMuted: '#bae6fd'
  },
  viagens: {
    label: 'Viagens e turismo',
    brandPool: ['Roteiro & Destino', 'Viaje Leve', 'Explorar Brasil'],
    accent: '#0e7490', accentLight: '#06b6d4', accentSoft: '#ecfeff', accentMuted: '#a5f3fc'
  },
  educacao: {
    label: 'Educação e estudos',
    brandPool: ['Aprenda Melhor', 'Estudo Focado', 'Método Simples'],
    accent: '#4338ca', accentLight: '#6366f1', accentSoft: '#eef2ff', accentMuted: '#c7d2fe'
  },
  carreira: {
    label: 'Carreira e trabalho',
    brandPool: ['Carreira Real', 'Trabalho Focado', 'Profissional Organizado'],
    accent: '#334155', accentLight: '#64748b', accentSoft: '#f8fafc', accentMuted: '#cbd5e1'
  },
  mente: {
    label: 'Saúde mental e equilíbrio',
    brandPool: ['Mente Leve', 'Equilíbrio Diário', 'Pausa Consciente'],
    accent: '#7c3aed', accentLight: '#a78bfa', accentSoft: '#f5f3ff', accentMuted: '#ddd6fe'
  },
  cultura: {
    label: 'Cultura e entretenimento',
    brandPool: ['Cultura Pop', 'Curadoria Cultural', 'Entretenimento Leve'],
    accent: '#be123c', accentLight: '#f43f5e', accentSoft: '#fff1f2', accentMuted: '#fecdd3'
  },
  moda: {
    label: 'Moda e estilo',
    brandPool: ['Estilo Casual', 'Guarda-Roupa Smart', 'Moda Real'],
    accent: '#9d174d', accentLight: '#db2777', accentSoft: '#fdf2f8', accentMuted: '#fbcfe8'
  },
  sustentabilidade: {
    label: 'Consumo consciente',
    brandPool: ['Eco Cotidiano', 'Consumo Consciente', 'Casa Sustentável'],
    accent: '#047857', accentLight: '#10b981', accentSoft: '#ecfdf5', accentMuted: '#a7f3d0'
  },
  noticias: {
    label: 'Informação e mídia',
    brandPool: ['Info Contexto', 'Leitura Crítica', 'Mídia Consciente'],
    accent: '#1e40af', accentLight: '#3b82f6', accentSoft: '#eff6ff', accentMuted: '#bfdbfe'
  }
};

function resolveThemeKey(themeKey) {
  const k = (themeKey || '').trim();
  if (!k || k === 'auto' || k === 'random') {
    const keys = Object.keys(THEMES);
    return keys[Math.floor(Math.random() * keys.length)] || 'geral';
  }
  return THEMES[k] ? k : 'geral';
}

function themeBrand(themeKey, opts = {}) {
  const t = THEMES[themeKey] || THEMES.geral;
  if (opts.brandName) return opts.brandName;
  if (t.defaultBrand) return t.defaultBrand;
  return pickBrandForTheme(themeKey, t.brandPool, 'Portal Editorial');
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Normaliza URL de imagem para funcionar melhor no celular (https, sem javascript:). */
function normalizeImageUrl(raw) {
  let s = String(raw || '').trim().replace(/^['"]|['"]$/g, '');
  if (!s) return '';
  if (/^javascript:/i.test(s) || /^data:text\/html/i.test(s)) return '';
  if (s.startsWith('//')) s = 'https:' + s;
  if (!/^https?:\/\//i.test(s) && /^[\w.-]+\.[a-z]{2,}/i.test(s)) s = 'https://' + s;
  if (!/^https?:\/\//i.test(s)) return '';
  try {
    const u = new URL(s);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch (e) {
    return '';
  }
}

function proStyles(t, variant = 'classic') {
  const { accent, accentLight, accentSoft, accentMuted } = t;
  const fonts = {
    classic: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    magazine: "Georgia, 'Times New Roman', Times, serif",
    minimal: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    compact: "'Inter', system-ui, sans-serif"
  };
  const font = fonts[variant] || fonts.classic;
  const heroPad = variant === 'compact' ? '36px 0 32px' : variant === 'magazine' ? '56px 0 44px' : '48px 0 40px';
  const articlePad = variant === 'compact' ? '28px 24px' : variant === 'minimal' ? '32px 28px' : '36px 32px';
  const articleShadow = variant === 'minimal' ? 'none' : 'var(--shadow)';
  const articleBorder = variant === 'minimal' ? 'none' : '1px solid var(--border)';
  const h1Size = variant === 'magazine' ? 'clamp(2rem, 5vw, 2.75rem)' : variant === 'compact' ? 'clamp(1.5rem, 3.5vw, 2rem)' : 'clamp(1.75rem, 4vw, 2.35rem)';
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
      --bg-subtle: ${variant === 'magazine' ? '#fafaf9' : '#f8fafc'};
      --shadow: 0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.04);
      --radius: ${variant === 'compact' ? '8px' : '12px'};
      --radius-lg: ${variant === 'compact' ? '12px' : '16px'};
      --font: ${font};
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--font); background: var(--bg-subtle); color: var(--text); line-height: ${variant === 'compact' ? '1.55' : '1.65'}; -webkit-font-smoothing: antialiased; }
    .topbar { background: rgba(255,255,255,0.92); border-bottom: 1px solid var(--border); padding: 14px 0; ${variant === 'minimal' ? '' : 'position: sticky; top: 0; z-index: 10;'} backdrop-filter: blur(8px); }
    .container { max-width: ${variant === 'magazine' ? '820px' : '760px'}; margin: 0 auto; padding: 0 24px; }
    .container-wide { max-width: 960px; margin: 0 auto; padding: 0 24px; }
    .topbar-inner { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .topbar-tag { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    .hero { background: ${variant === 'magazine' ? `linear-gradient(135deg, var(--accent-soft) 0%, var(--bg) 70%)` : `linear-gradient(165deg, var(--accent-soft) 0%, var(--bg) 55%)`}; padding: ${heroPad}; border-bottom: 1px solid var(--border); ${variant === 'magazine' ? 'border-left: 4px solid var(--accent);' : ''} }
    .hero-offer { padding: 56px 0 48px; }
    .category { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); padding: 5px 12px; border-radius: 999px; margin-bottom: 16px; }
    .badge-offer { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; background: var(--accent); padding: 6px 14px; border-radius: 999px; margin-bottom: 18px; }
    h1 { font-size: ${h1Size}; font-weight: 800; line-height: 1.2; letter-spacing: ${variant === 'magazine' ? '-0.02em' : '-0.03em'}; margin-bottom: 16px; }
    .lead { font-size: ${variant === 'compact' ? '1rem' : '1.125rem'}; color: var(--text-secondary); line-height: 1.7; max-width: 640px; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 24px; font-size: 13px; color: var(--text-muted); }
    .meta-dot::before { content: '·'; margin-right: 4px; }
    .byline { font-size: 13px; color: var(--text-muted); margin-top: 12px; font-style: ${variant === 'magazine' ? 'italic' : 'normal'}; }
    .content { padding: 40px 0 48px; }
    .content article { background: var(--bg); border: ${articleBorder}; border-radius: var(--radius-lg); padding: ${articlePad}; box-shadow: ${articleShadow}; }
    h2 { font-size: ${variant === 'magazine' ? '1.35rem' : '1.2rem'}; font-weight: 700; margin: 32px 0 10px; ${variant === 'magazine' ? 'font-family: var(--font);' : ''} }
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

function wrapHtml(title, body, styles, meta = {}) {
  const desc = esc((meta.description || '').slice(0, 160));
  const ogTitle = esc(meta.ogTitle || title);
  const ogDesc = desc || ogTitle;
  const ogImage = meta.ogImage ? `<meta property="og:image" content="${esc(meta.ogImage)}">` : '';
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="index, follow">
  <meta name="description" content="${ogDesc}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDesc}">
  <meta property="og:locale" content="pt_BR">
  ${ogImage}
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDesc}">
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

function buildEditorialPage(t, pageData, opts, pageType, themeKey) {
  const brand = esc(themeBrand(themeKey, opts));
  const year = new Date().getFullYear();
  const variant = pageData.layoutVariant || 'classic';
  const sections = (pageData.sections || []).map((s) => `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('');
  const pills = (pageData.highlights || []).map((h) => `<span class="pill">${esc(h)}</span>`).join('');
  const disclaimer = esc(pageData.disclaimer || 'Conteúdo informativo e editorial.');
  const byline = variant === 'magazine' ? `<p class="byline">Por Redação · ${esc(pageData.category)}</p>` : '';
  const body = `
  <div class="topbar"><div class="container topbar-inner">
    <div class="logo">${brand}</div>
    <div class="topbar-tag">${esc(pageData.category)}</div>
  </div></div>
  <section class="hero"><div class="container">
    <span class="category">${esc(pageData.category)}</span>
    <h1>${esc(pageData.title)}</h1>
    <p class="lead">${esc(pageData.lead)}</p>
    ${byline}
    <div class="meta"><span>${esc(pageData.readTime)}</span><span class="meta-dot">Atualizado em ${year}</span></div>
  </div></section>
  <section class="content"><div class="container"><article>
    ${sections}
    <div class="disclaimer">${disclaimer}</div>
    <div class="highlights">${pills}</div>
  </article></div></section>
  ${footerHtml(brand, year)}`;
  return wrapHtml(pageData.title, body, proStyles(t, variant), {
    description: pageData.lead || pageData.title,
    ogTitle: pageData.title
  });
}

function buildWhitePage(themeKey, opts = {}, pageData) {
  const key = resolveThemeKey(themeKey);
  const t = THEMES[key] || THEMES.geral;
  const data = pageData || composePageData(key, 'white');
  return buildEditorialPage(t, data, opts, 'white', key);
}

function buildGrayPage(themeKey, opts = {}, pageData) {
  const key = resolveThemeKey(themeKey);
  const t = THEMES[key] || THEMES.geral;
  const data = pageData || composePageData(key, 'gray');
  return buildEditorialPage(t, data, opts, 'gray', key);
}

function buildOfferPage(themeKey, opts = {}, pageData) {
  const key = resolveThemeKey(themeKey);
  const t = THEMES[key] || THEMES.geral;
  const o = pageData || composePageData(key, 'offer');
  const brand = esc(themeBrand(key, opts));
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
  const trustHtml = trust.map((x) => `<div><div class="trust-num">${esc(x.num)}</div><div class="trust-label">${esc(x.label)}</div></div>`).join('');
  const body = `
  <div class="topbar"><div class="container topbar-inner">
    <div class="logo">${brand}</div>
    <div class="topbar-tag">Oferta</div>
  </div></div>
  <section class="hero hero-offer"><div class="container">
    <span class="badge-offer">Acesso exclusivo</span>
    <h1>${product}</h1>
    <p class="lead">${esc(o.lead)}</p>
  </div></section>
  <section class="content"><div class="container">
    <div class="features">${features}</div>
    <article>
      <h2>O que você recebe</h2>
      <ul class="benefits">${bullets}</ul>
      <h2>Perguntas frequentes</h2>
      ${faq}
    </article>
    <div class="trust-bar">${trustHtml}</div>
  </div></section>
  ${footerHtml(brand, year)}`;
  return wrapHtml(product, body, proStyles(t, 'classic'), { description: o.lead || product, ogTitle: product });
}

function getStealthPagePack(themeKey = 'geral', opts = {}) {
  const key = resolveThemeKey(themeKey);
  const packId = uniquePackId();
  const generatedAt = formatPackStamp();
  const whiteData = composePageData(key, 'white');
  const grayData = composePageData(key, 'gray');
  const offerData = composePageData(key, 'offer');
  const mergedOpts = { ...opts };
  const whiteHeadline = whiteData.title;
  const grayHeadline = grayData.title;
  const offerHeadline = opts.productName || offerData.title;
  return {
    theme: key,
    themeLabel: (THEMES[key] || THEMES.geral).label,
    packId,
    generatedAt,
    titles: { white: whiteHeadline, gray: grayHeadline, offer: offerHeadline },
    pages: [
      {
        role: 'white',
        name: stealthPageName('White', whiteHeadline, generatedAt, packId),
        html_content: buildWhitePage(key, mergedOpts, whiteData)
      },
      {
        role: 'gray',
        name: stealthPageName('Gray', grayHeadline, generatedAt, packId),
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

/** Apenas white + gray (oferta sempre via URL externa). */
function getStealthWhiteGrayPack(themeKey = 'geral', opts = {}) {
  const pack = getStealthPagePack(themeKey, opts);
  return {
    theme: pack.theme,
    themeLabel: pack.themeLabel,
    packId: pack.packId,
    generatedAt: pack.generatedAt,
    titles: { white: pack.titles.white, gray: pack.titles.gray },
    pages: pack.pages.filter((p) => p.role === 'white' || p.role === 'gray')
  };
}

function listStealthThemes() {
  return [
    { id: 'auto', label: '🎲 Rotacionar tema automaticamente (recomendado)' },
    ...Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label }))
  ];
}

/**
 * Convite exclusivo.
 * withTimer + navPath → após timer consulta /api/n/ (lead→oferta; bot→white/gray no mesmo link).
 * NUNCA embute URL da oferta no HTML — o Meta lê o código-fonte e rejeita o anúncio.
 */
function buildInviteBridgeHtml(opts = {}) {
  const name = String(opts.influencerName || 'CONVIDADO').trim() || 'CONVIDADO';
  const nameEsc = esc(name);
  const photo = normalizeImageUrl(opts.photoUrl);
  const banner = normalizeImageUrl(opts.bannerUrl) || photo;
  const timerSec = Math.max(2, Math.min(30, parseInt(opts.timerSeconds, 10) || 6));
  const navPath = String(opts.navPath || '').trim();
  const withTimer = !!opts.withTimer && !!navPath;
  const year = new Date().getFullYear();
  const initials = name.replace(/[^A-Za-z0-9À-ÿ]/g, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase() || '?';
  const photoAttr = photo ? esc(photo) : '';
  const bannerAttr = banner ? esc(banner) : '';

  // Sem URL de oferta no HTML. Sem fallback para oferta. Só /api/n/ decide.
  const timerScript = withTimer
    ? `<script>(function(){try{if(navigator.webdriver)return;var total=${timerSec}*1000,nav=${JSON.stringify(navPath)},start=Date.now(),bar=document.getElementById('vx-prog'),lab=document.getElementById('vx-msg'),cta=document.getElementById('vx-cta'),lock=false,tryN=0;function go(d){if(!d||lock)return;if(d.inline&&d.html){lock=true;try{document.open();document.write(d.html);document.close()}catch(e){}return}if(d.next){lock=true;try{location.replace(d.next)}catch(e2){location.href=d.next}}}function fetchNav(){tryN++;var q=location.search||'';fetch(nav+q,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:'{}'}).then(function(r){return r.ok?r.json():null}).then(function(d){if(d)go(d);else if(tryN<3)setTimeout(fetchNav,380);else if(lab)lab.textContent='Validando acesso. Aguarde.'}).catch(function(){if(tryN<3)setTimeout(fetchNav,380)})}function frame(){var rem=Math.max(0,total-(Date.now()-start)),sec=Math.ceil(rem/1000),pct=Math.min(100,((total-rem)/total)*100);if(bar)bar.style.width=pct+'%';if(lab)lab.innerHTML=sec>0?('Liberando conteúdo em <strong>'+sec+'s</strong>…'):'Entrando agora…';if(cta)cta.textContent=sec>0?'Aguarde um instante…':'Abrindo…';if(rem<=0){fetchNav();return}requestAnimationFrame(frame)}requestAnimationFrame(frame)}catch(e){}})();</script>`
    : '';

  const styles = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,system-ui,-apple-system,sans-serif;background:#eef1f6;color:#111827;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:22px 16px;-webkit-font-smoothing:antialiased}
    .vx-panel{width:100%;max-width:392px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 16px 48px rgba(17,24,39,.1);border:1px solid rgba(15,23,42,.06)}
    .vx-cover{height:156px;background:linear-gradient(135deg,#312e81 0%,#1e1b4b 48%,#4338ca 100%);position:relative;overflow:hidden}
    .vx-cover-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:.55}
    .vx-cover-mask{position:absolute;inset:0;background:linear-gradient(180deg,rgba(30,27,75,.2),rgba(30,27,75,.82));pointer-events:none}
    .vx-profile{position:absolute;left:50%;bottom:-28px;transform:translateX(-50%);z-index:2;text-align:center;width:calc(100% - 32px)}
    .vx-avatar{width:56px;height:56px;border-radius:50%;border:3px solid #fff;box-shadow:0 4px 14px rgba(0,0,0,.22);margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;color:#fff;background:linear-gradient(145deg,#6366f1,#4338ca);overflow:hidden}
    .vx-avatar img{width:100%;height:100%;object-fit:cover;display:block}
    .vx-handle{font-size:14px;font-weight:800;color:#fff;letter-spacing:.03em;text-transform:uppercase;line-height:1.2;text-shadow:0 1px 4px rgba(0,0,0,.35)}
    .vx-tagline{font-size:11px;color:rgba(255,255,255,.9);margin-top:3px;text-shadow:0 1px 2px rgba(0,0,0,.25)}
    .vx-main{padding:42px 22px 20px}
    .vx-chip{display:inline-flex;align-items:center;gap:5px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#4338ca;background:#eef2ff;padding:5px 11px;border-radius:999px;margin-bottom:12px}
    .vx-chip i{width:5px;height:5px;border-radius:50%;background:#6366f1;display:inline-block}
    h1{font-size:1.28rem;font-weight:800;line-height:1.28;letter-spacing:-.02em;color:#111827;margin-bottom:12px}
    .vx-main p{font-size:14px;line-height:1.62;color:#4b5563;margin-bottom:11px}
    .vx-main p strong{color:#111827;font-weight:700}
    .vx-track{height:5px;background:#e5e7eb;border-radius:99px;overflow:hidden;margin:20px 0 9px}
    .vx-track span{display:block;height:100%;width:${withTimer ? '3%' : '72%'};background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:99px;transition:width .14s linear}
    .vx-status{text-align:center;font-size:13px;color:#6b7280;margin-bottom:14px;min-height:1.35em}
    .vx-cta{display:block;width:100%;border:none;border-radius:11px;padding:13px 16px;background:#374151;color:#fff;font-size:14px;font-weight:700;text-align:center;pointer-events:none;cursor:default;user-select:none}
    .vx-skip{display:block;width:100%;margin-top:9px;border:1px solid #e5e7eb;border-radius:11px;padding:11px 16px;background:#fafafa;color:#9ca3af;font-size:13px;font-weight:600;text-align:center;pointer-events:none;cursor:default}
    .vx-foot{text-align:center;font-size:11px;color:#9ca3af;padding:2px 22px 18px;line-height:1.45}
  `;

  const staticTimerLabel = withTimer
    ? `Liberando conteúdo em <strong>${timerSec}s</strong>…`
    : 'Validando acesso. Aguarde a confirmação.';

  const bannerImg = bannerAttr
    ? `<img class="vx-cover-img" src="${bannerAttr}" alt="" decoding="async" referrerpolicy="no-referrer" onerror="this.style.display='none'">`
    : '';
  const avatarInner = photoAttr
    ? `<img src="${photoAttr}" alt="${nameEsc}" decoding="async" referrerpolicy="no-referrer" onerror="this.remove();this.parentNode.textContent='${esc(initials)}'">`
    : esc(initials);

  const body = `
  <div class="vx-panel">
    <div class="vx-cover">
      ${bannerImg}
      <div class="vx-cover-mask"></div>
      <div class="vx-profile">
        <div class="vx-avatar" aria-hidden="true">${avatarInner}</div>
        <div class="vx-handle">${nameEsc}</div>
        <div class="vx-tagline">Indicação personalizada</div>
      </div>
    </div>
    <div class="vx-main">
      <div class="vx-chip"><i aria-hidden="true"></i> Indicação verificada</div>
      <h1>Seu nome consta nesta lista de acesso</h1>
      <p><strong>${nameEsc}</strong> indicou você para conferir o material reservado. O acesso é opcional e você pode sair quando quiser.</p>
      <p>Estamos validando sua sessão antes de abrir o conteúdo completo.</p>
      <div class="vx-track" aria-hidden="true"><span id="vx-prog"></span></div>
      <div class="vx-status" id="vx-msg">${staticTimerLabel}</div>
      <div class="vx-cta" id="vx-cta">${withTimer ? 'Aguarde um instante…' : 'Acesso reservado'}</div>
      <div class="vx-skip">Prefiro sair</div>
    </div>
    <div class="vx-foot">Conteúdo patrocinado · ${year}</div>
  </div>${timerScript}`;

  return wrapHtml(`${name} · Acesso reservado`, body, styles, {
    description: `${name} liberou um acesso para você.`,
    ogTitle: `Acesso · ${name}`,
    ogImage: photo || banner || ''
  });
}

/**
 * Ponte neutra — skeleton + "Carregando conteúdo…"
 * Meta vê versão estática; lead usa timer → POST /api/n/ (sem URL da oferta no HTML).
 */
function buildLoadingBridgeHtml(opts = {}) {
  const timerSec = Math.max(2, Math.min(30, parseInt(opts.timerSeconds, 10) || 3));
  const navPath = String(opts.navPath || '').trim();
  const withTimer = !!opts.withTimer && !!navPath;
  const year = new Date().getFullYear();

  const timerScript = withTimer
    ? `<script>(function(){try{if(navigator.webdriver)return;var total=${timerSec}*1000,nav=${JSON.stringify(navPath)},start=Date.now(),bar=document.getElementById('ld-bar'),lab=document.getElementById('ld-status'),done=false,tries=0;function apply(d){if(!d||done)return;if(d.inline&&d.html){done=true;try{document.open();document.write(d.html);document.close()}catch(e){}return}if(d.next){done=true;try{location.replace(d.next)}catch(e2){location.href=d.next}}}function pull(){tries++;var q=location.search||'';fetch(nav+q,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','Accept':'application/json'},body:'{}'}).then(function(r){return r.ok?r.json():null}).then(function(d){if(d)apply(d);else if(tries<3)setTimeout(pull,400);else if(lab)lab.textContent='Carregando conteúdo…'}).catch(function(){if(tries<3)setTimeout(pull,400)})}function tick(){var left=Math.max(0,total-(Date.now()-start)),s=Math.ceil(left/1000),pct=Math.min(100,((total-left)/total)*100);if(bar)bar.style.width=pct+'%';if(lab)lab.textContent=s>0?('Carregando conteúdo… '+s+'s'):'Abrindo conteúdo…';if(left<=0){pull();return}requestAnimationFrame(tick)}requestAnimationFrame(tick)}catch(e){}})();</script>`
    : '';

  const styles = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f4f6f8;color:#1e293b;min-height:100vh;-webkit-font-smoothing:antialiased}
    .top{height:3px;background:#e2e8f0;position:sticky;top:0;z-index:2}
    .top>i{display:block;height:100%;width:${withTimer ? '4%' : '38%'};background:linear-gradient(90deg,#64748b,#94a3b8);border-radius:0 2px 2px 0;transition:width .12s linear}
    .wrap{max-width:720px;margin:0 auto;padding:28px 20px 48px}
    .head{display:flex;align-items:center;gap:12px;margin-bottom:28px}
    .logo{width:36px;height:36px;border-radius:8px;background:linear-gradient(135deg,#cbd5e1,#94a3b8);flex-shrink:0}
    .head-lines{flex:1;min-width:0}
    .sk{display:block;border-radius:6px;background:linear-gradient(90deg,#e2e8f0 0%,#f1f5f9 45%,#e2e8f0 90%);background-size:200% 100%;animation:sh 1.4s ease-in-out infinite}
    @keyframes sh{0%{background-position:100% 0}100%{background-position:-100% 0}}
    .sk-h{height:14px;width:42%;margin-bottom:8px}
    .sk-s{height:10px;width:28%}
    .hero-sk{height:200px;border-radius:12px;margin-bottom:24px}
    .line-sk{height:12px;margin-bottom:12px}
    .line-sk.w90{width:90%}.line-sk.w75{width:75%}.line-sk.w60{width:60%}.line-sk.w85{width:85%}
    .status{margin-top:32px;text-align:center;font-size:14px;color:#64748b;min-height:1.4em}
    .foot{margin-top:40px;text-align:center;font-size:11px;color:#94a3b8}
  `;

  const statusText = withTimer ? `Carregando conteúdo… ${timerSec}s` : 'Carregando conteúdo…';

  const body = `
  <div class="top" aria-hidden="true"><i id="ld-bar"></i></div>
  <div class="wrap">
    <div class="head">
      <div class="logo" aria-hidden="true"></div>
      <div class="head-lines">
        <span class="sk sk-h" aria-hidden="true"></span>
        <span class="sk sk-s" aria-hidden="true"></span>
      </div>
    </div>
    <div class="sk hero-sk" aria-hidden="true"></div>
    <span class="sk line-sk w90" aria-hidden="true"></span>
    <span class="sk line-sk w75" aria-hidden="true"></span>
    <span class="sk line-sk w85" aria-hidden="true"></span>
    <span class="sk line-sk w60" aria-hidden="true"></span>
    <p class="status" id="ld-status" role="status">${statusText}</p>
    <p class="foot">© ${year}</p>
  </div>${timerScript}`;

  return wrapHtml('Carregando…', body, styles, {
    description: 'Carregando conteúdo.',
    ogTitle: 'Carregando…'
  });
}

module.exports = {
  getStealthPagePack,
  getStealthWhiteGrayPack,
  listStealthThemes,
  resolveThemeKey,
  buildInviteBridgeHtml,
  buildLoadingBridgeHtml,
  normalizeImageUrl,
  THEMES
};
