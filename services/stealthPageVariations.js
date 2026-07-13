/**
 * Pools de conteúdo — cada geração sorteia combinações únicas (white / gray / oferta).
 */

const EXTENDED_BANKS = require('./stealthThemeBanks');

const READ_TIMES = ['4 min de leitura', '5 min de leitura', '6 min de leitura', '7 min de leitura', '8 min de leitura', '3 min de leitura', '9 min de leitura'];

const LAYOUT_VARIANTS = ['classic', 'magazine', 'minimal', 'compact'];

const DISCLAIMERS = [
  'Conteúdo informativo e editorial. Não substitui orientação profissional especializada.',
  'Texto de caráter educativo. Consulte um profissional qualificado para orientação personalizada.',
  'Material informativo para leitura geral. Opiniões editoriais, não recomendação individual.',
  'Artigo editorial. Para decisões importantes, busque fontes especializadas.',
  'Conteúdo publicado com fins informativos. Leia com espírito crítico e contexto.'
];

const OFFER_BADGES = ['Material completo', 'Acesso digital', 'Biblioteca exclusiva', 'Conteúdo premium', 'Edição especial', 'Acesso imediato', 'Guia digital', 'Acervo online'];

const TRUST_BARS = [
  [{ num: '100%', label: 'Conteúdo digital' }, { num: '24/7', label: 'Acesso imediato' }, { num: '+', label: 'Atualizações' }],
  [{ num: '24/7', label: 'Disponível sempre' }, { num: '100%', label: 'Online' }, { num: 'PDF', label: 'Guias inclusos' }],
  [{ num: '+50', label: 'Artigos' }, { num: '12', label: 'Módulos' }, { num: '∞', label: 'Consultas' }]
];

function pickOne(arr) {
  if (!arr || !arr.length) return '';
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, count) {
  if (!arr || !arr.length) return [];
  const copy = [...arr];
  const out = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function uniquePackId() {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `${t}${r}`;
}

const CONTENT_BANKS = {
  'bem-estar': {
    white: {
      categories: ['Bem-estar', 'Autocuidado', 'Saúde leve', 'Rotina saudável'],
      titles: [
        'Hábitos sustentáveis para mais energia no dia a dia',
        'Pequenas rotinas que mudam como você se sente',
        'Equilíbrio entre trabalho, descanso e autocuidado',
        'Guia leve de bem-estar para a rotina real',
        'Como construir mais disposição sem atalhos',
        'Sono, hidratação e movimento: o trio do dia a dia'
      ],
      leads: [
        'Orientações baseadas em boas práticas de autocuidado — sem promessas milagrosas.',
        'Texto informativo sobre hábitos simples que cabem na sua agenda.',
        'Leitura para quem busca mais clareza sobre rotina, descanso e energia.',
        'Conteúdo editorial sobre bem-estar aplicável ao cotidiano.',
        'Ideias práticas para quem quer cuidar de si com consistência, não perfeição.'
      ],
      sections: [
        { h: 'Por que pequenas mudanças funcionam', p: 'A consistência supera intensidade. Ajustes graduais tendem a ser mais sustentáveis do que mudanças radicais de curto prazo.' },
        { h: 'Sono e recuperação', p: 'Respeitar uma janela regular de descanso influencia humor, foco e disposição ao longo da semana.' },
        { h: 'Movimento ao longo do dia', p: 'Caminhadas curtas e pausas ativas ajudam na circulação e reduzem a fadiga mental.' },
        { h: 'Hidratação consciente', p: 'Manter-se hidratado ao longo do dia impacta energia e concentração de forma silenciosa mas real.' },
        { h: 'Alimentação sem radicalismo', p: 'Incluir mais alimentos in natura de forma gradual costuma funcionar melhor do que dietas restritivas.' },
        { h: 'Pausas longe da tela', p: 'Intervalos curtos sem celular ajudam o cérebro a processar informações e retomar tarefas com mais clareza.' },
        { h: 'Respiração e ritmo', p: 'Dois minutos de respiração consciente podem reduzir a sensação de pressa no meio do dia.' },
        { h: 'Limites saudáveis', p: 'Dizer não a compromissos excessivos protege sua energia — é parte do autocuidado, não egoísmo.' }
      ],
      highlights: ['Conteúdo informativo', 'Linguagem acessível', 'Sem venda direta', 'Leitura rápida', 'Dicas práticas', 'Tom editorial']
    },
    gray: {
      categories: ['Guia prático', 'Rotina', 'Checklist', 'Plano diário'],
      titles: [
        'Guia prático: rotina matinal em 15 minutos',
        'Como organizar a manhã sem correria',
        'Roteiro simples para começar o dia com foco',
        '15 minutos que mudam o tom da sua manhã',
        'Checklist matinal para mais clareza',
        'Primeiros passos de uma rotina equilibrada'
      ],
      leads: [
        'Um roteiro objetivo para as primeiras horas do dia.',
        'Passos simples para reduzir a sensação de correria constante.',
        'Material de apoio para estruturar a manhã com calma.',
        'Guia rápido para quem quer mais controle no início do dia.'
      ],
      sections: [
        { h: 'Minuto 1–5: hidratação e respiração', p: 'Comece com água e dois minutos de respiração consciente para sair do modo automático.' },
        { h: 'Minuto 6–10: prioridades', p: 'Anote até três tarefas essenciais antes de abrir redes sociais ou e-mail.' },
        { h: 'Minuto 11–15: movimento leve', p: 'Alongamentos ou caminhada curta ativam o corpo sem exigir equipamento.' },
        { h: 'Evite o celular nos primeiros minutos', p: 'Adiar o scroll matinal reduz ansiedade e abre espaço para decisões conscientes.' },
        { h: 'Luz natural ajuda', p: 'Expor-se à luz do dia na janela ou na varanda sinaliza ao corpo que o dia começou.' },
        { h: 'Prepare a noite anterior', p: 'Roupa, agenda e água prontos economizam decisões pela manhã.' }
      ],
      highlights: ['Passo a passo', 'Aplicação imediata', 'Material de apoio', '15 minutos', 'Sem equipamento']
    },
    offer: {
      titles: ['Programa completo de bem-estar', 'Método de rotina saudável', 'Guia estruturado de autocuidado', 'Plano de hábitos sustentáveis', 'Jornada de bem-estar em módulos'],
      leads: [
        'Conteúdo estruturado em módulos para hábitos, rotina e autocuidado.',
        'Material organizado para aplicar no dia a dia, no seu ritmo.',
        'Trilha progressiva de bem-estar com orientações claras.',
        'Biblioteca digital com guias, checklists e leituras complementares.'
      ],
      features: [
        { title: 'Módulos organizados', desc: 'Conteúdo em etapas progressivas, do básico ao avançado.' },
        { title: 'Plano de rotina', desc: 'Sugestões para manhã, tarde e noite adaptáveis à agenda.' },
        { title: 'Checklists semanais', desc: 'Ferramentas simples para acompanhar hábitos.' },
        { title: 'Guia de sono', desc: 'Orientações para melhorar a qualidade do descanso.' },
        { title: 'Receitas leves', desc: 'Sugestões alimentares sem restrições extremas.' },
        { title: 'Pausas conscientes', desc: 'Exercícios breves para usar durante o trabalho.' },
        { title: 'Linguagem direta', desc: 'Sem jargão — foco em aplicação real.' },
        { title: 'Suporte em PDF', desc: 'Material para imprimir ou salvar offline.' }
      ],
      bullets: [
        'Material para leitura no seu ritmo',
        'Estrutura clara com objetivos por módulo',
        'Conteúdo editorial, sem promessas irreais',
        'Atualizações periódicas do acervo',
        'Acesso imediato após liberação',
        'Formato otimizado para celular'
      ],
      faq: [
        { q: 'Para quem é indicado?', a: 'Para quem busca organizar hábitos de forma gradual, sem atalhos milagrosos.' },
        { q: 'Preciso de equipamentos?', a: 'Não. O foco é rotina, sono, alimentação consciente e movimento leve.' },
        { q: 'Quanto tempo por dia?', a: 'Você define. O material foi pensado para encaixar em rotinas ocupadas.' },
        { q: 'É acompanhamento individual?', a: 'Não. É conteúdo digital estruturado para autonomia.' }
      ]
    }
  },
  financas: {
    white: {
      categories: ['Educação financeira', 'Organização', 'Finanças pessoais', 'Planejamento'],
      titles: [
        'Como organizar suas finanças sem complicar',
        'Entenda para onde seu dinheiro vai',
        'Primeiros passos para clareza financeira',
        'Orçamento pessoal de forma simples',
        'Organização financeira para o dia a dia',
        'Finanças sem jargão: um guia inicial'
      ],
      leads: [
        'Conteúdo educativo sobre orçamento e planejamento pessoal.',
        'Leitura para quem quer mais tranquilidade nas decisões do dia a dia.',
        'Texto informativo — sem promessas de lucro rápido.',
        'Ideias práticas para mapear entradas e saídas com clareza.'
      ],
      sections: [
        { h: 'O mapa dos gastos', p: 'Separar despesas fixas e variáveis revela padrões que passam despercebidos.' },
        { h: 'Reserva de emergência', p: 'Mesmo uma reserva modesta reduz ansiedade diante de imprevistos.' },
        { h: 'Metas realistas', p: 'Objetivos pequenos e mensuráveis mantêm a motivação ao longo do tempo.' },
        { h: 'Gastos invisíveis', p: 'Assinaturas e compras por impulso costumam pesar mais do que parecem.' },
        { h: 'Receita vs. estilo de vida', p: 'Ajustar gastos ao que você realmente ganha é o fundamento de qualquer plano.' },
        { h: 'Revisão mensal', p: 'Vinte minutos por mês bastam para retomar o controle das finanças.' }
      ],
      highlights: ['Sem promessas de lucro', 'Foco educativo', 'Linguagem clara', 'Uso pessoal', 'Passo a passo']
    },
    gray: {
      categories: ['Ferramenta prática', 'Checklist', 'Revisão mensal'],
      titles: [
        'Checklist: revisão financeira em 20 minutos',
        'Fechamento do mês em poucos passos',
        'Rotina mensal para suas finanças',
        'Como revisar contas sem planilha complexa',
        'Guia rápido de organização financeira'
      ],
      leads: [
        'Rotina objetiva para revisar entradas, saídas e metas.',
        'Material de apoio para o fechamento mensal.',
        'Passos claros para quem quer consistência financeira.'
      ],
      sections: [
        { h: 'Conferir entradas', p: 'Liste salários, freelas e outras fontes — confira se tudo entrou.' },
        { h: 'Classificar despesas', p: 'Agrupe por categoria e compare com o mês anterior.' },
        { h: 'Ajustar o próximo mês', p: 'Defina limites por categoria e uma meta de economia realista.' },
        { h: 'Separar contas fixas', p: 'Aluguel, internet e transporte devem estar mapeados primeiro.' },
        { h: 'Identificar vazamentos', p: 'Assinaturas esquecidas e taxas recorrentes merecem atenção.' }
      ],
      highlights: ['20 minutos', 'Modelo replicável', 'Uso pessoal', 'Checklist', 'Sem planilha complexa']
    },
    offer: {
      titles: ['Método de organização financeira', 'Sistema de controle pessoal', 'Plano financeiro estruturado', 'Kit de organização de gastos', 'Método clareza financeira'],
      leads: [
        'Material para sair do improviso e construir um plano claro.',
        'Sistema de registro e revisão de receitas e despesas.',
        'Trilha educativa para organização financeira pessoal.'
      ],
      features: [
        { title: 'Planilha-guia', desc: 'Modelo visual para entradas e saídas.' },
        { title: 'Categorização', desc: 'Classificação que revela para onde o dinheiro vai.' },
        { title: 'Metas por etapa', desc: 'Marcos para reserva, dívidas e objetivos.' },
        { title: 'Revisão guiada', desc: 'Roteiro mensal de 20 minutos.' },
        { title: 'Exemplos reais', desc: 'Cenários comuns explicados passo a passo.' },
        { title: 'Dívidas: por onde começar', desc: 'Priorização simples sem técnicas arriscadas.' }
      ],
      bullets: ['Conteúdo educativo', 'Adaptável a diferentes rendas', 'Foco em organização', 'Sem consultoria individual', 'Acesso digital imediato'],
      faq: [
        { q: 'Serve para endividados?', a: 'Ajuda a mapear a situação; não substitui negociação com credores.' },
        { q: 'Preciso saber Excel?', a: 'Não. O material inclui modelos prontos.' },
        { q: 'Fala de investimentos?', a: 'Foco em organização, não em aplicações de risco.' }
      ]
    }
  },
  geral: {
    white: {
      categories: ['Editorial', 'Produtividade', 'Bem-estar digital', 'Leitura'],
      titles: [
        'Insights para produtividade e foco',
        'Ideias para um dia a dia mais claro',
        'Leituras sobre hábitos e atenção',
        'Como reduzir ruído na rotina digital',
        'Textos para pensar a semana com calma',
        'Produtividade sem pressão constante'
      ],
      leads: [
        'Seleção editorial de ideias práticas — leitura rápida e tom informativo.',
        'Conteúdo para quem busca mais clareza no cotidiano.',
        'Artigos curtos sobre foco, hábitos e bem-estar digital.'
      ],
      sections: [
        { h: 'Foco em um objetivo', p: 'Blocos de tempo para uma atividade aumentam a sensação de progresso real.' },
        { h: 'Pausas intencionais', p: 'Intervalos curtos previnem burnout e mantêm a energia.' },
        { h: 'Menos distrações', p: 'Pequenos ajustes no ambiente geram ganhos desproporcionais.' },
        { h: 'Listas que funcionam', p: 'Três prioridades por dia costumam ser mais eficazes que listas infinitas.' },
        { h: 'Ritmo sustentável', p: 'Produtividade não é velocidade máxima o tempo todo — é consistência.' }
      ],
      highlights: ['Leitura objetiva', 'Dicas aplicáveis', 'Sem compromisso', 'Tom leve', 'Mobile first']
    },
    gray: {
      categories: ['Curadoria', 'Seleção semanal', 'Leituras'],
      titles: [
        'Leituras recomendadas desta semana',
        'Seleção editorial: foco e hábitos',
        'Textos curtos para pausas do dia',
        'Curadoria: produtividade digital',
        'O que ler quando tiver cinco minutos'
      ],
      leads: [
        'Textos selecionados sobre tecnologia, foco e rotina.',
        'Curadoria semanal de artigos informativos.',
        'Leituras leves para o intervalo do dia.'
      ],
      sections: [
        { h: 'Limites com o celular', p: 'Horários sem notificações têm impacto relatado por muitos leitores.' },
        { h: 'E-mail em blocos', p: 'Processar mensagens em horários fixos libera atenção.' },
        { h: 'Revisão semanal', p: 'Quinze minutos no domingo ajudam a planejar a semana.' },
        { h: 'Modo avião criativo', p: 'Períodos offline curtos melhoram a qualidade do trabalho profundo.' },
        { h: 'Ambiente de trabalho', p: 'Mesa limpa e fones quando possível reduzem fragmentação.' }
      ],
      highlights: ['Curadoria editorial', 'Temas atuais', 'Leitura leve', '5 minutos', 'Sem cadastro']
    },
    offer: {
      titles: ['Biblioteca completa de conteúdo', 'Acervo digital organizado', 'Coleção premium de artigos', 'Hub de leituras e guias', 'Material integral do portal'],
      leads: [
        'Acesso a artigos, guias e frameworks no seu ritmo.',
        'Biblioteca digital com trilhas por tema.',
        'Conteúdo organizado para consulta contínua.'
      ],
      features: [
        { title: 'Artigos aprofundados', desc: 'Textos completos sobre produtividade e foco.' },
        { title: 'Frameworks práticos', desc: 'Modelos para planejamento semanal.' },
        { title: 'Guias temáticos', desc: 'Trilhas por objetivo: energia, organização, hábitos.' },
        { title: 'Atualizações', desc: 'Novos conteúdos adicionados periodicamente.' },
        { title: 'Resumos executivos', desc: 'Versões curtas para leitura rápida.' },
        { title: 'Checklists', desc: 'Listas prontas para aplicar no dia a dia.' }
      ],
      bullets: ['Leitura no seu ritmo', 'Conteúdo editorial', 'Consulta rápida', 'Acesso imediato', 'Otimizado para mobile'],
      faq: [
        { q: 'É curso em vídeo?', a: 'Formato principalmente textual e organizado em módulos.' },
        { q: 'Uso profissional?', a: 'Sim, para aplicação pessoal e profissional.' },
        { q: 'Tem prazo de acesso?', a: 'Consulte as condições do material ao ser liberado.' }
      ]
    }
  },
  'central-leituras': {
    white: {
      categories: ['Editorial', 'Central de Leituras', 'Artigos', 'Curadoria'],
      titles: [
        'Artigos e reflexões para o seu dia a dia',
        'Leituras que fazem sentido na correria',
        'Textos selecionados pela Central de Leituras',
        'O que ler hoje: ideias e hábitos',
        'Portal de leituras leves e informativas',
        'Reflexões curtas para pausas do dia',
        'Sua dose diária de leitura consciente',
        'Temas que importam no cotidiano real'
      ],
      leads: [
        'Seleção editorial sobre hábitos, bem-estar e produtividade.',
        'Leitura leve, sem compromisso — só conteúdo informativo.',
        'A Central de Leituras organiza temas para você explorar no seu ritmo.',
        'Artigos pensados para leitura no celular, em poucos minutos.',
        'Conteúdo editorial atualizado com frequência.'
      ],
      sections: [
        { h: 'Ler pouco, mas com frequência', p: 'Doses curtas e regulares ajudam a absorver ideias sem sobrecarga.' },
        { h: 'Temas do cotidiano', p: 'Rotina, sono, organização e foco dialogam com a vida real.' },
        { h: 'Leitura mobile', p: 'Parágrafos curtos funcionam melhor em telas pequenas.' },
        { h: 'Curadoria humana', p: 'Textos escolhidos por relevância, não por algoritmo de engajamento.' },
        { h: 'Sem pressão de compra', p: 'Este portal é informativo — leia com calma e avalie o que faz sentido.' },
        { h: 'Pausas que valem', p: 'Trocar scroll infinito por um artigo curto pode mudar o tom do seu intervalo.' },
        { h: 'Hábitos de leitura', p: 'Reservar o mesmo horário diário cria consistência sem esforço heróico.' },
        { h: 'Variedade de assuntos', p: 'Produtividade, bem-estar e finanças leves aparecem na curadoria da semana.' }
      ],
      highlights: ['Portal editorial', 'Leitura gratuita', 'Temas variados', 'Atualizado', 'Mobile', 'Sem cadastro']
    },
    gray: {
      categories: ['Curadoria semanal', 'Seleção', 'Leituras da semana'],
      titles: [
        'Leituras da semana: produtividade digital',
        'Seleção Central de Leituras — edição atual',
        'Textos para ler entre uma tarefa e outra',
        'Curadoria: hábitos, foco e descanso',
        'O que está em alta na biblioteca aberta',
        'Cinco leituras para sua pausa de hoje',
        'Edição da semana: menos ruído, mais clareza'
      ],
      leads: [
        'Curadoria semanal para quem quer usar a tecnologia com intenção.',
        'Textos selecionados pela equipe editorial.',
        'Leituras rápidas para o intervalo do dia.',
        'Seleção temática atualizada periodicamente.'
      ],
      sections: [
        { h: 'Menos notificações', p: 'Desativar alertas não essenciais pela manhã aumenta o foco.' },
        { h: 'Pausas sem scroll', p: 'Cinco minutos longe da tela restauram a atenção.' },
        { h: 'Leitura antes de dormir', p: 'Artigo curto no lugar de redes pode melhorar o descanso.' },
        { h: 'Modo leitura', p: 'Ativar modo silencioso ajuda a terminar um texto sem interrupções.' },
        { h: 'Favoritos organizados', p: 'Salvar artigos para reler cria uma biblioteca pessoal simples.' },
        { h: 'Compartilhar com critério', p: 'Indicar leituras úteis vale mais do que encaminhar qualquer link.' }
      ],
      highlights: ['Seleção semanal', 'Temas atuais', 'Leitura rápida', 'Editorial', 'Gratuito']
    },
    offer: {
      titles: [
        'Biblioteca completa Central de Leituras',
        'Acervo premium da Central de Leituras',
        'Acesso integral à biblioteca digital',
        'Coleção exclusiva de artigos e guias',
        'Central de Leituras — edição completa',
        'Hub de conteúdo organizado por trilhas'
      ],
      leads: [
        'Artigos, guias e trilhas organizadas por tema.',
        'Acesso ao acervo completo para consultar quando quiser.',
        'Material digital estruturado em módulos progressivos.',
        'Biblioteca com conteúdo além do que está aberto no portal.'
      ],
      features: [
        { title: 'Artigos exclusivos', desc: 'Textos além do conteúdo aberto do portal.' },
        { title: 'Trilhas por tema', desc: 'Sequências sobre foco, energia e organização.' },
        { title: 'Guias em PDF', desc: 'Checklists para aplicar o que você leu.' },
        { title: 'Novidades semanais', desc: 'Conteúdo novo adicionado regularmente.' },
        { title: 'Resumos expandidos', desc: 'Versões longas dos artigos mais lidos.' },
        { title: 'Índice por assunto', desc: 'Encontre leituras por tema em segundos.' },
        { title: 'Leitura offline', desc: 'Salve PDFs para consultar sem internet.' },
        { title: 'Trilha iniciante', desc: 'Por onde começar se você é novo no portal.' }
      ],
      bullets: [
        'Leitura ilimitada na biblioteca',
        'Organizado por módulos e temas',
        'Acesso imediato após liberação',
        'Otimizado para celular',
        'Atualizações incluídas',
        'Sem conhecimento prévio necessário'
      ],
      faq: [
        { q: 'É assinatura mensal?', a: 'Formato de acesso digital ao acervo completo — condições conforme liberação.' },
        { q: 'Funciona no celular?', a: 'Sim. Todo o material foi pensado para mobile.' },
        { q: 'Posso baixar os PDFs?', a: 'Guias selecionados estão disponíveis para download.' },
        { q: 'Tem suporte?', a: 'Material autoguiado; dúvidas operacionais via canal de contato do portal.' }
      ]
    }
  },
  ...EXTENDED_BANKS
};

function composeEditorialPage(themeKey, role) {
  const banks = CONTENT_BANKS[themeKey] || CONTENT_BANKS.geral;
  const bank = banks[role] || banks.white;
  return {
    title: pickOne(bank.titles),
    lead: pickOne(bank.leads),
    category: pickOne(bank.categories),
    readTime: pickOne(READ_TIMES),
    sections: pickMany(bank.sections, 3 + Math.floor(Math.random() * 2)),
    highlights: pickMany(bank.highlights, 3 + Math.floor(Math.random() * 2)),
    layoutVariant: pickOne(LAYOUT_VARIANTS),
    disclaimer: pickOne(DISCLAIMERS)
  };
}

function composeOfferPage(themeKey) {
  const bank = (CONTENT_BANKS[themeKey] || CONTENT_BANKS.geral).offer;
  return {
    title: pickOne(bank.titles),
    lead: pickOne(bank.leads),
    badge: pickOne(OFFER_BADGES),
    features: pickMany(bank.features, 4).map((f, i) => ({ ...f, icon: String(i + 1).padStart(2, '0') })),
    bullets: pickMany(bank.bullets, 3),
    faq: pickMany(bank.faq, 2),
    trustBar: pickOne(TRUST_BARS)
  };
}

function composePageData(themeKey, role) {
  if (role === 'offer') return composeOfferPage(themeKey);
  return composeEditorialPage(themeKey, role);
}

function listThemeKeys() {
  return Object.keys(CONTENT_BANKS);
}

function pickRandomTheme() {
  const keys = listThemeKeys();
  return keys[Math.floor(Math.random() * keys.length)];
}

function pickBrandForTheme(themeKey, brandPool, fallback) {
  if (brandPool && brandPool.length) return pickOne(brandPool);
  return fallback || 'Portal Editorial';
}

module.exports = {
  composePageData,
  uniquePackId,
  pickRandomTheme,
  pickBrandForTheme,
  listThemeKeys,
  CONTENT_BANKS
};
