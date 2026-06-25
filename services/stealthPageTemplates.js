/**
 * Modelos HTML para funil Stealth (white / gray / oferta).
 * Mesmo tema visual — white e gray informativos; oferta com CTA editável.
 */

const THEMES = {
  'bem-estar': {
    label: 'Saúde e bem-estar',
    whiteTitle: 'Hábitos simples para mais energia no dia a dia',
    whiteLead: 'Pequenas mudanças na rotina podem refletir no humor, no foco e na disposição. Veja orientações gerais baseadas em boas práticas de autocuidado.',
    grayTitle: 'Guia prático: rotina matinal em 15 minutos',
    grayLead: 'Organizar a manhã ajuda a reduzir o estresse e melhorar a consistência dos hábitos. Este material é apenas informativo.',
    offerTitle: 'Programa completo de bem-estar',
    offerLead: 'Acesso a conteúdo organizado em módulos, com orientações práticas para aplicar no seu dia a dia.',
    offerCta: 'Quero conhecer o programa',
    accent: '#0d9488',
    accentSoft: '#ccfbf1'
  },
  financas: {
    label: 'Finanças e organização',
    whiteTitle: 'Como organizar gastos sem complicar a vida',
    whiteLead: 'Entender para onde o dinheiro vai é o primeiro passo para tomar decisões com mais tranquilidade. Conteúdo educativo, sem promessas irreais.',
    grayTitle: 'Checklist: revisão financeira mensal',
    grayLead: 'Uma rotina simples de 20 minutos por mês pode ajudar a evitar surpresas. Material de apoio informativo.',
    offerTitle: 'Método de organização financeira',
    offerLead: 'Material estruturado para quem quer começar a organizar receitas e despesas com clareza.',
    offerCta: 'Ver detalhes do método',
    accent: '#2563eb',
    accentSoft: '#dbeafe'
  },
  geral: {
    label: 'Conteúdo geral',
    whiteTitle: 'Informações úteis para o seu dia a dia',
    whiteLead: 'Artigos e dicas selecionadas para leitura rápida. Conteúdo editorial, sem compromisso de compra.',
    grayTitle: 'Leituras recomendadas desta semana',
    grayLead: 'Seleção de textos informativos sobre produtividade, hábitos e bem-estar digital.',
    offerTitle: 'Acesse o conteúdo completo',
    offerLead: 'Descubra o material completo preparado para você. Leia com calma e avalie se faz sentido para o seu momento.',
    offerCta: 'Continuar leitura',
    accent: '#6366f1',
    accentSoft: '#e0e7ff'
  }
};

function baseStyles(accent, accentSoft) {
  return `
    :root { --accent: ${accent}; --accent-soft: ${accentSoft}; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, 'Times New Roman', serif; background: #fafafa; color: #1a1a1a; line-height: 1.7; }
    .wrap { max-width: 680px; margin: 0 auto; padding: 28px 20px 48px; }
    header { border-bottom: 1px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 28px; }
    .brand { font-family: system-ui, sans-serif; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #888; margin-bottom: 12px; }
    h1 { font-size: 1.65rem; line-height: 1.25; font-weight: 700; margin-bottom: 14px; }
    .lead { font-size: 1.05rem; color: #444; margin-bottom: 24px; }
    h2 { font-size: 1.15rem; margin: 28px 0 12px; color: #222; }
    p { margin-bottom: 16px; color: #333; }
    ul { margin: 0 0 20px 20px; color: #333; }
    li { margin-bottom: 8px; }
    .note { background: var(--accent-soft); border-left: 3px solid var(--accent); padding: 14px 16px; font-size: 0.9rem; color: #444; margin: 24px 0; border-radius: 0 8px 8px 0; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 0.8rem; color: #888; font-family: system-ui, sans-serif; }
    @media (max-width: 480px) { h1 { font-size: 1.35rem; } .wrap { padding: 20px 16px 36px; } }
  `;
}

function offerStyles(accent, accentSoft) {
  return baseStyles(accent, accentSoft) + `
    .cta-box { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 28px 24px; margin: 32px 0; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .cta-btn { display: inline-block; margin-top: 16px; padding: 14px 32px; background: var(--accent); color: #fff !important; text-decoration: none; border-radius: 8px; font-family: system-ui, sans-serif; font-weight: 600; font-size: 1rem; }
    .cta-btn:hover { opacity: 0.92; }
    .badge { display: inline-block; font-family: system-ui, sans-serif; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); padding: 4px 10px; border-radius: 999px; margin-bottom: 12px; }
  `;
}

function wrapHtml(title, bodyInner, styles) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="wrap">
    ${bodyInner}
  </div>
</body>
</html>`;
}

function buildWhitePage(themeKey, opts = {}) {
  const t = THEMES[themeKey] || THEMES.geral;
  const brand = (opts.brandName || 'Conteúdo informativo').replace(/</g, '');
  const body = `
    <header>
      <div class="brand">${brand}</div>
      <h1>${t.whiteTitle}</h1>
      <p class="lead">${t.whiteLead}</p>
    </header>
    <article>
      <h2>Hidratação e sono</h2>
      <p>Manter-se hidratado e respeitar uma janela de sono regular são bases que influenciam disposição e concentração ao longo do dia.</p>
      <h2>Movimento leve</h2>
      <p>Caminhadas curtas, alongamentos e pausas longe da tela ajudam na circulação e reduzem a sensação de cansaço mental.</p>
      <div class="note">Este conteúdo é informativo. Para orientação personalizada, consulte um profissional qualificado na sua área.</div>
    </article>
    <footer>© ${new Date().getFullYear()} · Material editorial · Atualizado periodicamente</footer>`;
  return wrapHtml(t.whiteTitle, body, baseStyles(t.accent, t.accentSoft));
}

function buildGrayPage(themeKey, opts = {}) {
  const t = THEMES[themeKey] || THEMES.geral;
  const brand = (opts.brandName || 'Central de leituras').replace(/</g, '');
  const body = `
    <header>
      <div class="brand">${brand}</div>
      <h1>${t.grayTitle}</h1>
      <p class="lead">${t.grayLead}</p>
    </header>
    <article>
      <h2>Passo 1 — Anotar prioridades</h2>
      <p>Liste três tarefas principais antes de abrir redes sociais ou e-mail. Isso reduz a dispersão nas primeiras horas.</p>
      <h2>Passo 2 — Blocos de foco</h2>
      <p>Reserve intervalos de 25 a 45 minutos para uma única atividade, com pausa curta entre eles.</p>
      <h2>Passo 3 — Revisão rápida</h2>
      <p>Ao final do dia, revise o que foi feito e ajuste o plano do dia seguinte em poucos minutos.</p>
      <div class="note">Página de apoio informativo. Não substitui aconselhamento profissional.</div>
    </article>
    <footer>© ${new Date().getFullYear()} · Guia prático · Uso pessoal</footer>`;
  return wrapHtml(t.grayTitle, body, baseStyles(t.accent, t.accentSoft));
}

function buildOfferPage(themeKey, opts = {}) {
  const t = THEMES[themeKey] || THEMES.geral;
  const brand = (opts.brandName || 'Acesso exclusivo').replace(/</g, '');
  const product = (opts.productName || t.offerTitle).replace(/</g, '');
  const cta = (opts.ctaText || t.offerCta).replace(/</g, '');
  const ctaUrl = (opts.ctaUrl || '#').replace(/"/g, '&quot;');
  const body = `
    <header>
      <span class="badge">Material completo</span>
      <div class="brand">${brand}</div>
      <h1>${product}</h1>
      <p class="lead">${t.offerLead}</p>
    </header>
    <article>
      <h2>O que você encontra</h2>
      <ul>
        <li>Conteúdo organizado em etapas claras</li>
        <li>Linguagem acessível, sem jargões desnecessários</li>
        <li>Foco em aplicação prática no dia a dia</li>
      </ul>
      <h2>Para quem é</h2>
      <p>Para pessoas que buscam informação estruturada e querem avançar com um plano definido — no seu ritmo.</p>
      <div class="cta-box">
        <p style="margin-bottom:0;font-family:system-ui,sans-serif;color:#555;">Pronto para continuar?</p>
        <a class="cta-btn" href="${ctaUrl}">${cta}</a>
        <p style="margin-top:14px;font-size:12px;color:#999;font-family:system-ui,sans-serif;">Edite o link do botão em Páginas após gerar o pacote.</p>
      </div>
      <div class="note">Substitua o texto e o link do botão acima pelo seu produto real antes de rodar anúncios.</div>
    </article>
    <footer>© ${new Date().getFullYear()} · Todos os direitos reservados</footer>`;
  return wrapHtml(product, body, offerStyles(t.accent, t.accentSoft));
}

function getStealthPagePack(themeKey = 'geral', opts = {}) {
  const key = THEMES[themeKey] ? themeKey : 'geral';
  const suffix = opts.suffix ? ` ${opts.suffix}` : '';
  return {
    theme: key,
    themeLabel: THEMES[key].label,
    pages: [
      { role: 'white', name: `[Stealth] White page — ${THEMES[key].label}${suffix}`, html_content: buildWhitePage(key, opts) },
      { role: 'gray', name: `[Stealth] Gray page — ${THEMES[key].label}${suffix}`, html_content: buildGrayPage(key, opts) },
      { role: 'offer', name: `[Stealth] Oferta — ${THEMES[key].label}${suffix}`, html_content: buildOfferPage(key, opts) }
    ]
  };
}

function listStealthThemes() {
  return Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label }));
}

module.exports = { getStealthPagePack, listStealthThemes, THEMES };
