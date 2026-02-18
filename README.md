# 🔒 Cloaker Pro - Sistema de Proteção Multi-Sites

Sistema completo de cloaking com painel de controle para monitorar **múltiplos sites** em uma única instalação.

## ✨ Funcionalidades

- 📊 **Dashboard** com estatísticas em tempo real
- 🌐 **Multi-Sites** - Gerencie quantos sites quiser
- 👥 **50+ dados** coletados de cada visitante
- 🛡️ **Proteção** contra desktops, bots, DevTools
- 📈 **Gráficos** de visitas, países, navegadores
- 📥 **Exportação** de dados (JSON/CSV)
- ⚙️ **Configurações** individuais por site
- 🔄 **Fallback automático** – Se a URL da landing cair, o sistema troca para uma URL de contingência em segundos
- 📱 **Notificações Telegram** – Avisos quando um site fica offline ou volta a funcionar

## 🔄 Fallback de Site (URLs de contingência)

O sistema verifica a cada **1 minuto** se as URLs das suas landings estão ativas. Se detectar offline:

1. Troca automaticamente para a primeira URL de contingência cadastrada que responder
2. Envia notificação no **Telegram** (link que caiu + link novo em uso)
3. Quando a URL principal voltar, retorna ao uso normal e avisa no Telegram

**Configuração Telegram:** defina no ambiente (ex: Railway Variables):
- `TELEGRAM_BOT_TOKEN` – Token do Bot (crie em @BotFather)
- `TELEGRAM_CHAT_ID` – ID do chat/ grupo para receber os avisos

## 🚀 Instalação

```bash
# 1. Entre na pasta
cd "cloaker teste"

# 2. Instale as dependências (já feito!)
npm install

# 3. Inicie o servidor
npm start
```

Acesse: **http://localhost:3000**

## 📱 Como Usar em Múltiplos Sites

### Passo 1: Criar um Site no Painel
1. Acesse o painel em `http://localhost:3000`
2. Clique em **"Meus Sites"**
3. Clique em **"Novo Site"**
4. Preencha o nome e domínio
5. Configure as regras de bloqueio
6. Salve

### Passo 2: Copiar o Script
Cada site terá um script único, por exemplo:
```html
<script src="https://SEU-SERVIDOR.com/t/site_abc123.js"></script>
```

### Passo 3: Colar na Landing Page
Cole o script no `<head>` de cada landing page:
```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://SEU-SERVIDOR.com/t/site_abc123.js"></script>
</head>
<body>
  <!-- Seu conteúdo -->
</body>
</html>
```

## 🔄 Fluxo de Funcionamento

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Seu Site A    │     │   Seu Site B    │     │   Seu Site C    │
│  (landing page) │     │  (landing page) │     │  (landing page) │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │    Cada site tem      │                       │
         │    seu próprio ID     │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Servidor Cloaker     │
                    │   (único servidor)     │
                    └────────────┬───────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   Painel de Controle   │
                    │  (monitora todos)      │
                    └────────────────────────┘
```

## ☁️ Deploy em Hospedagem

### Opção 1: Railway (Recomendado - Grátis)
1. Acesse [railway.app](https://railway.app)
2. Conecte seu GitHub
3. Faça upload da pasta
4. Deploy automático!

### Opção 2: Render (Grátis)
1. Acesse [render.com](https://render.com)
2. Crie um novo Web Service
3. Conecte o repositório
4. Deploy automático!

### Opção 3: VPS (DigitalOcean, Vultr)
```bash
# Na VPS, clone/envie os arquivos
npm install
npm install -g pm2
pm2 start server.js --name cloaker
pm2 save
```

### Opção 4: Vercel
Crie um arquivo `vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "server.js" }]
}
```

## 📁 Arquivos do Projeto

```
cloaker teste/
├── server.js          # Servidor principal
├── package.json       # Dependências
├── cloaker.db         # Banco de dados (criado automaticamente)
├── README.md          # Este arquivo
└── public/
    ├── index.html     # Painel de controle
    └── tracker.js     # Script de proteção
```

## ⚠️ Avisos Importantes

1. Este sistema é apenas para fins educacionais
2. Cloaking pode violar termos de serviço de plataformas de anúncios
3. Use com responsabilidade

## 📞 Problemas Comuns

**Erro de porta em uso:**
```bash
# Mude a porta no server.js ou use:
PORT=3001 npm start
```

**Banco de dados corrompido:**
```bash
# Delete o arquivo e reinicie:
del cloaker.db
npm start
```

---

**Pronto para usar!** 🚀
