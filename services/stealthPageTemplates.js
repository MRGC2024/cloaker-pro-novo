/**
 * Modelos HTML profissionais para funil Stealth (white / gray / oferta).
 * Oferta = página interna (Zero-Redirect). URL externa é configurada em Meus Sites.
 */

const THEMES = {
  'bem-estar': {
    label: 'Saúde e bem-estar',
    accent: '#0f766e',
    accentLight: '#14b8a6',
    accentSoft: '#f0fdfa',
    accentMuted: '#99f6e4',
    white: {
      title: 'Hábitos sustentáveis para mais energia e equilíbrio no dia a dia',
      lead: 'Orientações baseadas em boas práticas de autocuidado — sem promessas milagrosas, com foco em rotina, sono e bem-estar mental.',
      category: 'Bem-estar',
      readTime: '6 min de leitura',
      sections: [
        { h: 'Por que pequenas mudanças funcionam', p: 'A consistência supera intensidade. Ajustes graduais na alimentação, hidratação e movimento tendem a ser mais sustentáveis do que mudanças radicais de curto prazo.' },
        { h: 'Sono e recuperação', p: 'Respeitar uma janela regular de descanso influencia humor, foco e disposição. Evitar telas intensas antes de dormir é uma das práticas mais citadas por especialistas em saúde do sono.' },
        { h: 'Movimento ao longo do dia', p: 'Caminhadas curtas, alongamentos e pausas ativas ajudam na circulação e reduzem a fadiga mental — especialmente para quem passa muitas horas sentado.' }
      ],
      highlights: ['Conteúdo informativo', 'Linguagem acessível', 'Sem venda direta']
    },
    gray: {
      title: 'Guia prático: como estruturar uma rotina matinal em 15 minutos',
      lead: 'Um roteiro simples para organizar as primeiras horas do dia e reduzir a sensação de correria constante.',
      category: 'Guia prático',
      readTime: '4 min de leitura',
      sections: [
        { h: 'Minuto 1–5: hidratação e respiração', p: 'Comece com um copo de água e dois minutos de respiração consciente. Isso ajuda a sair do modo automático e entrar no dia com mais clareza.' },
        { h: 'Minuto 6–10: prioridades do dia', p: 'Anote até três tarefas essenciais antes de abrir redes sociais ou e-mail. Isso reduz dispersão e aumenta a sensação de controle.' },
        { h: 'Minuto 11–15: movimento leve', p: 'Alongamentos ou uma caminhada curta ativam o corpo sem exigir equipamento. O objetivo é consistência, não performance.' }
      ],
      highlights: ['Passo a passo', 'Aplicação imediata', 'Material de apoio']
    },
    offer: {
      title: 'Programa completo de bem-estar',
      lead: 'Conteúdo estruturado em módulos para quem busca orientação clara sobre hábitos, rotina e autocuidado no dia a dia.',
      badge: 'Acesso ao material',
      features: [
        { icon: '01', title: 'Módulos organizados', desc: 'Conteúdo dividido em etapas progressivas, do básico ao avançado.' },
        { icon: '02', title: 'Plano de rotina', desc: 'Sugestões práticas para manhã, tarde e noite adaptáveis à sua agenda.' },
        { icon: '03', title: 'Checklists semanais', desc: 'Ferramentas simples para acompanhar hábitos sem complicar.' },
        { icon: '04', title: 'Linguagem direta', desc: 'Sem jargão técnico — foco em aplicação real no cotidiano.' }
      ],
      bullets: ['Material pensado para leitura no seu ritmo', 'Estrutura clara com objetivos por módulo', 'Conteúdo editorial, sem promessas irreais'],
      faq: [
        { q: 'Para quem é indicado?', a: 'Para pessoas que querem organizar hábitos de forma gradual e buscam um guia estruturado, não um atalho instantâneo.' },
        { q: 'Preciso de equipamentos?', a: 'Não. O foco está em rotina, sono, alimentação consciente e movimento leve.' }
      ]
    }
  },
  financas: {
    label: 'Finanças e organização',
    accent: '#1d4ed8',
    accentLight: '#3b82f6',
    accentSoft: '#eff6ff',
    accentMuted: '#bfdbfe',
    white: {
      title: 'Como organizar suas finanças pessoais sem complicar',
      lead: 'Entender para onde o dinheiro vai é o primeiro passo para decidir com mais tranquilidade. Conteúdo educativo sobre orçamento e planejamento.',
      category: 'Educação financeira',
      readTime: '7 min de leitura',
      sections: [
        { h: 'O mapa dos seus gastos', p: 'Separar despesas fixas e variáveis ajuda a enxergar padrões. Muitas pessoas descobrem gastos recorrentes que nem percebiam ao fazer essa revisão mensal.' },
        { h: 'Reserva e previsibilidade', p: 'Ter uma reserva de emergência — mesmo que modesta — reduz ansiedade diante de imprevistos. O valor ideal varia conforme sua realidade.' },
        { h: 'Metas realistas', p: 'Definir objetivos alcançáveis em prazos curtos mantém a motivação. Grandes metas podem ser divididas em marcos menores e mensuráveis.' }
      ],
      highlights: ['Sem promessas de lucro', 'Foco educativo', 'Linguagem clara']
    },
    gray: {
      title: 'Checklist: revisão financeira mensal em 20 minutos',
      lead: 'Uma rotina objetiva para revisar entradas, saídas e ajustar o planejamento do mês seguinte.',
      category: 'Ferramenta prática',
      readTime: '5 min de leitura',
      sections: [
        { h: 'Conferir entradas', p: 'Liste salários, freelas e outras fontes de renda do mês. Verifique se todos os valores esperados entraram na conta.' },
        { h: 'Classificar despesas', p: 'Agrupe gastos por categoria: moradia, alimentação, transporte, lazer. Identifique onde houve variação em relação ao mês anterior.' },
        { h: 'Ajustar o próximo mês', p: 'Com base na revisão, defina limites por categoria e uma meta de economia — mesmo que pequena — para o período seguinte.' }
      ],
      highlights: ['20 minutos por mês', 'Modelo replicável', 'Uso pessoal']
    },
    offer: {
      title: 'Método de organização financeira pessoal',
      lead: 'Material estruturado para quem quer sair do improviso e construir um plano claro de controle de receitas e despesas.',
      badge: 'Material completo',
      features: [
        { icon: '01', title: 'Planilha-guia', desc: 'Modelo para registrar entradas e saídas de forma visual e simples.' },
        { icon: '02', title: 'Categorização inteligente', desc: 'Sistema de classificação que revela onde o dinheiro realmente vai.' },
        { icon: '03', title: 'Metas por etapa', desc: 'Marcos mensais para reserva, dívidas e objetivos pessoais.' },
        { icon: '04', title: 'Revisão guiada', desc: 'Roteiro de 20 minutos para fechar cada mês com clareza.' }
      ],
      bullets: ['Conteúdo educativo, não consultoria individual', 'Adaptável a diferentes níveis de renda', 'Foco em organização, não em investimentos arriscados'],
      faq: [
        { q: 'Serve para quem está endividado?', a: 'O material ajuda a mapear a situação e priorizar ações, mas não substitui negociação com credores ou assessoria profissional.' },
        { q: 'Preciso de conhecimento prévio?', a: 'Não. O método foi pensado para iniciantes que querem começar do zero.' }
      ]
    }
  },
  geral: {
    label: 'Conteúdo geral',
    accent: '#4f46e5',
    accentLight: '#6366f1',
    accentSoft: '#eef2ff',
    accentMuted: '#c7d2fe',
    white: {
      title: 'Insights para produtividade, foco e bem-estar digital',
      lead: 'Seleção editorial de ideias práticas para quem busca mais clareza no dia a dia — leitura rápida, tom informativo.',
      category: 'Editorial',
      readTime: '5 min de leitura',
      sections: [
        { h: 'Foco em um objetivo por vez', p: 'Multitarefa reduz a qualidade do trabalho. Blocos de tempo dedicados a uma única atividade aumentam a sensação de progresso real.' },
        { h: 'Pausas intencionais', p: 'Intervalos curtos e regulares previnem burnout e mantêm a energia ao longo do dia. O cérebro precisa de recuperação para performar bem.' },
        { h: 'Ambiente e distrações', p: 'Notificações, abas abertas e ruído constante fragmentam a atenção. Pequenos ajustes no ambiente de trabalho geram ganhos desproporcionais.' }
      ],
      highlights: ['Leitura objetiva', 'Dicas aplicáveis', 'Sem compromisso']
    },
    gray: {
      title: 'Leituras recomendadas: produtividade e hábitos digitais',
      lead: 'Textos selecionados sobre como usar a tecnologia a favor — sem cair em armadilhas de distração constante.',
      category: 'Curadoria',
      readTime: '4 min de leitura',
      sections: [
        { h: 'Limites com o celular', p: 'Definir horários sem notificações — especialmente pela manhã e antes de dormir — é uma das mudanças com maior impacto relatado por leitores.' },
        { h: 'Caixa de entrada zero', p: 'Processar e-mails em blocos fixos, em vez de responder em tempo real, libera atenção para trabalho profundo.' },
        { h: 'Revisão semanal', p: 'Quinze minutos no domingo para planejar a semana reduzem a ansiedade de segunda-feira e aumentam a sensação de controle.' }
      ],
      highlights: ['Curadoria editorial', 'Temas atuais', 'Leitura leve']
    },
    offer: {
      title: 'Biblioteca completa de conteúdo',
      lead: 'Acesso ao material integral — artigos, guias e frameworks organizados para consulta e aplicação no seu ritmo.',
      badge: 'Conteúdo premium',
      features: [
        { icon: '01', title: 'Artigos aprofundados', desc: 'Textos completos sobre produtividade, hábitos e foco.' },
        { icon: '02', title: 'Frameworks práticos', desc: 'Modelos prontos para planejamento semanal e revisão mensal.' },
        { icon: '03', title: 'Guias temáticos', desc: 'Trilhas organizadas por objetivo: foco, energia, organização.' },
        { icon: '04', title: 'Atualizações', desc: 'Novos conteúdos adicionados periodicamente à biblioteca.' }
      ],
      bullets: ['Leitura no seu ritmo, sem pressão', 'Conteúdo editorial de qualidade', 'Estrutura pensada para consulta rápida'],
      faq: [
        { q: 'É um curso com aulas?', a: 'O formato é principalmente textual e organizado em módulos de leitura, com guias práticos complementares.' },
        { q: 'Posso usar no trabalho?', a: 'Sim. O material é voltado para aplicação pessoal e profissional.' }
      ]
    }
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
      --shadow-lg: 0 4px 6px rgba(15,23,42,0.04), 0 20px 48px rgba(15,23,42,0.08);
      --radius: 12px;
      --radius-lg: 16px;
      --font: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { font-family: var(--font); background: var(--bg-subtle); color: var(--text); line-height: 1.65; -webkit-font-smoothing: antialiased; }
    .topbar { background: var(--bg); border-bottom: 1px solid var(--border); padding: 14px 0; position: sticky; top: 0; z-index: 10; backdrop-filter: blur(8px); background: rgba(255,255,255,0.92); }
    .container { max-width: 760px; margin: 0 auto; padding: 0 24px; }
    .container-wide { max-width: 960px; margin: 0 auto; padding: 0 24px; }
    .topbar-inner { display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 15px; font-weight: 700; color: var(--text); letter-spacing: -0.02em; }
    .logo span { color: var(--accent); }
    .topbar-tag { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    .hero { background: linear-gradient(165deg, var(--accent-soft) 0%, var(--bg) 55%); padding: 48px 0 40px; border-bottom: 1px solid var(--border); }
    .hero-offer { padding: 56px 0 48px; }
    .category { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); background: var(--accent-soft); padding: 5px 12px; border-radius: 999px; margin-bottom: 16px; }
    .badge-offer { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #fff; background: var(--accent); padding: 6px 14px; border-radius: 999px; margin-bottom: 18px; }
    h1 { font-size: clamp(1.75rem, 4vw, 2.35rem); font-weight: 800; line-height: 1.2; letter-spacing: -0.03em; color: var(--text); margin-bottom: 16px; }
    .lead { font-size: 1.125rem; color: var(--text-secondary); line-height: 1.7; max-width: 640px; }
    .meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 24px; font-size: 13px; color: var(--text-muted); }
    .meta span { display: flex; align-items: center; gap: 6px; }
    .meta-dot::before { content: '·'; margin-right: 4px; color: var(--border); }
    .content { padding: 40px 0 48px; }
    .content article { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 36px 32px; box-shadow: var(--shadow); }
    h2 { font-size: 1.2rem; font-weight: 700; color: var(--text); margin: 32px 0 10px; letter-spacing: -0.02em; }
    h2:first-child { margin-top: 0; }
    p { margin-bottom: 16px; color: var(--text-secondary); font-size: 1rem; }
    .highlights { display: flex; flex-wrap: wrap; gap: 8px; margin: 28px 0 0; padding-top: 24px; border-top: 1px solid var(--border); }
    .pill { font-size: 12px; font-weight: 600; color: var(--accent); background: var(--accent-soft); padding: 6px 14px; border-radius: 999px; }
    .disclaimer { background: var(--accent-soft); border-left: 3px solid var(--accent); padding: 16px 18px; border-radius: 0 var(--radius) var(--radius) 0; margin-top: 28px; font-size: 0.9rem; color: var(--text-secondary); }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 32px 0; }
    .feature-card { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px 20px; box-shadow: var(--shadow); transition: box-shadow 0.2s; }
    .feature-num { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: var(--accent-soft); color: var(--accent); font-size: 13px; font-weight: 800; border-radius: 10px; margin-bottom: 14px; }
    .feature-card h3 { font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--text); }
    .feature-card p { font-size: 0.9rem; margin: 0; color: var(--text-secondary); }
    .benefits { list-style: none; margin: 24px 0; }
    .benefits li { position: relative; padding: 10px 0 10px 28px; color: var(--text-secondary); font-size: 0.95rem; border-bottom: 1px solid var(--border); }
    .benefits li:last-child { border-bottom: none; }
    .benefits li::before { content: ''; position: absolute; left: 0; top: 16px; width: 8px; height: 8px; background: var(--accent); border-radius: 50%; }
    .faq { margin-top: 32px; }
    .faq-item { border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 10px; overflow: hidden; background: var(--bg); }
    .faq-q { padding: 16px 20px; font-weight: 700; font-size: 0.95rem; color: var(--text); background: var(--bg-subtle); }
    .faq-a { padding: 14px 20px 18px; font-size: 0.9rem; color: var(--text-secondary); }
    .trust-bar { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; padding: 28px 0; margin-top: 8px; border-top: 1px solid var(--border); }
    .trust-item { text-align: center; }
    .trust-num { font-size: 1.5rem; font-weight: 800; color: var(--accent); letter-spacing: -0.03em; }
    .trust-label { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    footer { background: var(--bg); border-top: 1px solid var(--border); padding: 28px 0; margin-top: 0; }
    .footer-inner { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; font-size: 13px; color: var(--text-muted); }
    .footer-links { display: flex; gap: 20px; }
    .footer-links a { color: var(--text-muted); text-decoration: none; }
  @media (max-width: 600px) {
    .container, .container-wide { padding: 0 18px; }
    .hero { padding: 36px 0 32px; }
    .content article { padding: 24px 20px; }
    .features { grid-template-columns: 1fr; }
  }`;
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
<body>
${body}
</body>
</html>`;
}

function footerHtml(brand, year) {
  return `
  <footer>
    <div class="container footer-inner">
      <div>© ${year} ${esc(brand)} · Todos os direitos reservados</div>
      <div class="footer-links">
        <a href="#">Privacidade</a>
        <a href="#">Termos</a>
        <a href="#">Contato</a>
      </div>
    </div>
  </footer>`;
}

function buildEditorialPage(t, pageData, opts, pageType) {
  const brand = esc(opts.brandName || (pageType === 'white' ? 'Revista Digital' : 'Central de Conteúdo'));
  const year = new Date().getFullYear();
  const sections = (pageData.sections || []).map(s =>
    `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`
  ).join('');
  const pills = (pageData.highlights || []).map(h => `<span class="pill">${esc(h)}</span>`).join('');

  const body = `
  <div class="topbar"><div class="container topbar-inner">
    <div class="logo">${brand}</div>
    <div class="topbar-tag">${esc(pageData.category)}</div>
  </div></div>
  <section class="hero"><div class="container">
    <span class="category">${esc(pageData.category)}</span>
    <h1>${esc(pageData.title)}</h1>
    <p class="lead">${esc(pageData.lead)}</p>
    <div class="meta">
      <span>${esc(pageData.readTime)}</span>
      <span class="meta-dot">Atualizado em ${year}</span>
    </div>
  </div></section>
  <section class="content"><div class="container">
    <article>
      ${sections}
      <div class="disclaimer">Conteúdo informativo e editorial. Não substitui orientação profissional especializada.</div>
      <div class="highlights">${pills}</div>
    </article>
  </div></section>
  ${footerHtml(brand, year)}`;

  return wrapHtml(pageData.title, body, proStyles(t));
}

function buildWhitePage(themeKey, opts = {}) {
  const t = THEMES[themeKey] || THEMES.geral;
  return buildEditorialPage(t, t.white, opts, 'white');
}

function buildGrayPage(themeKey, opts = {}) {
  const t = THEMES[themeKey] || THEMES.geral;
  return buildEditorialPage(t, t.gray, opts, 'gray');
}

function buildOfferPage(themeKey, opts = {}) {
  const t = THEMES[themeKey] || THEMES.geral;
  const o = t.offer;
  const brand = esc(opts.brandName || 'Acesso Exclusivo');
  const product = esc(opts.productName || o.title);
  const year = new Date().getFullYear();

  const features = (o.features || []).map(f => `
    <div class="feature-card">
      <div class="feature-num">${esc(f.icon)}</div>
      <h3>${esc(f.title)}</h3>
      <p>${esc(f.desc)}</p>
    </div>`).join('');

  const bullets = (o.bullets || []).map(b => `<li>${esc(b)}</li>`).join('');
  const faq = (o.faq || []).map(item => `
    <div class="faq-item">
      <div class="faq-q">${esc(item.q)}</div>
      <div class="faq-a">${esc(item.a)}</div>
    </div>`).join('');

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
    <article style="margin-top: 24px;">
      <h2 style="margin-top:0">O que está incluído</h2>
      <ul class="benefits">${bullets}</ul>
      <div class="trust-bar">
        <div class="trust-item"><div class="trust-num">100%</div><div class="trust-label">Conteúdo digital</div></div>
        <div class="trust-item"><div class="trust-num">24/7</div><div class="trust-label">Acesso imediato</div></div>
        <div class="trust-item"><div class="trust-num">+</div><div class="trust-label">Atualizações inclusas</div></div>
      </div>
    </article>
    <div class="faq" style="margin-top: 32px;">
      <h2 style="margin-bottom: 16px; font-size: 1.1rem;">Perguntas frequentes</h2>
      ${faq}
    </div>
    <div class="disclaimer" style="margin-top: 28px; border-radius: var(--radius); border-left: none; border: 1px solid var(--border); background: var(--bg);">
      Material digital para consulta e estudo. Resultados variam conforme dedicação e contexto individual de cada pessoa.
    </div>
  </div></section>
  ${footerHtml(brand, year)}`;

  return wrapHtml(product, body, proStyles(t));
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
