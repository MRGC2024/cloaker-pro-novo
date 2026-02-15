# Análise de Detecção pelo Meta Ads – Vulnerabilidades e Melhorias

## Resumo Executivo

O Meta/Facebook usa múltiplos sinais para identificar cloaking:
- **IPs** de moderadores e datacenters (Amazon, GCP, Meta)
- **User-Agent** de crawlers, headless browsers, Selenium
- **Comportamento**: sem cookies, bounce instantâneo, sem scroll, sem UTM/fbclid
- **IA**: análise de creatives, URLs e padrões de redirecionamento
- **Fingerprinting**: canvas, WebGL, referrer

**Problema principal**: Quando o Meta faz duas requisições (como bot vs. como usuário) e recebe respostas diferentes (uma vai para Google, outra para oferta), isso caracteriza cloaking.

---

## Vulnerabilidades Identificadas no Código

### 1. **CRÍTICO – Canvas Fingerprint com "CloakerPro"**
- **Arquivo:** `public/tracker.js` linha 185
- **Código:** `ctx.fillText('CloakerPro', 2, 15);`
- **Risco:** Qualquer script na página pode extrair o canvas e ver esse texto. O Meta pode injetar JS para detectar.
- **Correção:** Usar texto genérico (ex: caracteres aleatórios ou data).

### 2. **CRÍTICO – API /api/config/:siteId Exposta**
- **Arquivo:** `server.js`
- **Problema:** Endpoint público retorna `redirect_url`, `block_desktop`, `block_facebook_library`, `block_bots`, `allowed_countries` etc.
- **Risco:** Um crawler pode chamar `/api/config/xyz` e receber a configuração completa do cloaker.
- **Correção:** Exigir token, ou restringir Referer/Origin, ou limitar dados retornados.

### 3. **ALTO – User-Agent "CloakerPro" em Requests Server-Side**
- **Arquivo:** `server.js` linhas 265, 1148
- **Código:** `'User-Agent': 'CloakerPro-PropagationCheck/1.0'` e `'User-Agent': 'CloakerPro/1.0'`
- **Risco:** Serviços externos (ipapi, ip-api) podem logar e correlacionar.
- **Correção:** Usar User-Agent de navegador comum.

### 4. **ALTO – Cookie de Sessão "cloaker.sid"**
- **Arquivo:** `server.js` linha 95
- **Risco:** Se exposto (ex: em cenários de domínio compartilhado), identifica o sistema.
- **Correção:** Nome genérico como `sid` ou `sess`.

### 5. **MÉDIO – Padrão de URL /go/CODE**
- **Problema:** O padrão `/go/` é amplamente conhecido em cloakers.
- **Risco:** Meta pode ter lista de padrões de URL.
- **Correção:** Permitir rotas alternativas configuráveis (ex: `/r/`, `/l/`, `/v/`).

### 6. **MÉDIO – Comentários e Nomes no tracker.js**
- **Arquivo:** `public/tracker.js`
- **Problema:** Comentários como "🔒 CLOAKER PRO" e nomes de variáveis expõem o sistema.
- **Risco:** Inspeção do script pelo Meta.
- **Correção:** Ofuscar ou remover comentários; minificar em produção.

### 7. **MÉDIO – Lista de Bots Explícita**
- **Arquivo:** `server.js` e `tracker.js`
- **Problema:** Lista contém `facebookexternalhit`, `facebot` – quando bloqueamos, o Meta não vê o destino.
- **Risco:** Esse é o objetivo, mas a diferença bot vs. usuário é o que o Meta detecta.
- **Nota:** Não há solução fácil; alternativas (mostrar página fake para bot) são complexas.

### 8. **BAIXO – Página "Em manutenção"**
- **Arquivo:** `server.js` linha 79
- **Problema:** Página genérica quando se acessa domínio raiz.
- **Correção:** Conteúdo mais natural (ex: página de negócio genérica).

### 9. **BAIXO – Redirect 302 Imediato**
- **Problema:** Redirect muito rápido pode indicar processamento server-side.
- **Correção:** Pequeno delay aleatório (50–200 ms) antes do redirect.

---

## Melhorias Implementadas / Recomendadas

| Prioridade | Melhoria | Status |
|------------|----------|--------|
| 1 | Remover "CloakerPro" do canvas | ✅ Feito |
| 2 | Proteger /api/config (rate limit + sem User-Agent) | ✅ Feito |
| 3 | Trocar User-Agent server-side para Mozilla | ✅ Feito |
| 4 | Cookie com nome genérico (sid) | ✅ Feito |
| 5 | Adicionar rota alternativa (/r/) | ✅ Feito |
| 6 | Delay aleatório no redirect (50–150ms) | ✅ Feito |
| 7 | Ofuscar comentários no tracker | ✅ Feito |
| 8 | Expandir lista de bots (Meta, Instagram, etc.) | ✅ Feito |
| 9 | Página "Em manutenção" mais natural | ✅ Feito |

---

## Fluxo Atual (Link para Ads)

1. Usuário clica no anúncio → URL: `https://domínio.com/go/CODE?ref=xxx&fbclid=...`
2. Servidor recebe em `/go/:code`
3. Checa: ref, IP/país, User-Agent (bot/desktop/emulador), referrer Facebook
4. Se passar → 302 para `target_url` (oferta)
5. Se bloquear → 302 para `redirect_url` (Google)

O Meta pode:
- Fazer request com User-Agent de bot → recebe 302 para Google
- Fazer request com User-Agent de usuário → recebe 302 para oferta
- Conclusão: cloaking detectado

**Não há como esconder completamente essa diferença** – é a natureza do cloaker. O foco deve ser:
- Remover assinaturas que identificam *qual* cloaker está sendo usado
- Dificultar fingerprinting e análise estática
- Variar comportamento para não parecer scripted
