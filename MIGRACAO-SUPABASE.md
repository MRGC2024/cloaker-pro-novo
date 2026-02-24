# Migração para Supabase (PostgreSQL)

Sim, **Supabase funciona** como banco externo. O app usa PostgreSQL quando a variável `DATABASE_URL` está definida. Segue como fazer a migração **sem precisar dar acesso** a nada: você executa os passos e, se quiser, roda o script de migração no seu PC.

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login.
2. **New project** → escolha organização, nome do projeto, senha do banco (guarde essa senha).
3. Aguarde o projeto ficar pronto.

---

## 2. Pegar a connection string (Session mode)

1. No projeto Supabase → **Project Settings** (ícone de engrenagem) → **Database**.
2. Em **Connection string** escolha **URI**.
3. Copie a URL. Ela vem assim:  
   `postgresql://postgres.[PROJECT-REF]:[SENHA]@aws-0-[REGIAO].pooler.supabase.com:6543/postgres`
4. Troque `[YOUR-PASSWORD]` pela senha do banco que você definiu ao criar o projeto.
5. Para o app Node (long-lived), use o **Session mode** (porta **5432** se aparecer a opção, ou a porta do pooler **6543**). No Supabase, em **Connection string** há opção "Session" vs "Transaction" — use **Session** para o app.
6. Para o app Cloaker, use a URL **sem** `?sslmode=require` no final (o app já configura SSL). Exemplo final:  
   `postgresql://postgres.xxxx:SUA_SENHA@aws-0-us-west-2.pooler.supabase.com:6543/postgres`

---

## 3. Fazer backup do banco atual (antes de trocar)

1. No **painel do seu site** (Railway, com o app ainda usando SQLite/volume): faça login como **admin**.
2. Vá em **Configurações** (ou Admin) → **Backup do banco**.
3. Clique em **Download backup (JSON)** e guarde o arquivo (ex.: `cloaker-backup-2025-02-02.json`).

Assim você não perde dados.

---

## 4. Rodar a migração (dados do backup → Supabase)

As tabelas no Supabase são criadas **na primeira vez que o app sobe** com `DATABASE_URL` definido. Para **levar os dados** do backup para o Supabase, use o script de migração **no seu computador** (ou em qualquer máquina com Node):

1. Instale as dependências do projeto (se ainda não tiver):  
   `npm install`
2. Defina a variável `DATABASE_URL` com a connection string do Supabase (passo 2).
3. Rode o script passando o arquivo de backup:

**Windows (PowerShell):**
```powershell
cd "c:\Users\drrod\Downloads\blokbot v2"
$env:DATABASE_URL = "postgresql://postgres.xxxx:SUA_SENHA@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
node scripts/migrate-json-to-pg.js "C:\caminho\para\cloaker-backup-2025-02-02.json"
```

**Linux/macOS:**
```bash
cd /caminho/para/blokbot-v2
DATABASE_URL="postgresql://postgres.xxxx:SUA_SENHA@....supabase.com:6543/postgres?sslmode=require" node scripts/migrate-json-to-pg.js cloaker-backup-2025-02-02.json
```

O script **cria as tabelas** no Supabase (se ainda não existirem) e insere **users**, **settings**, **sites**, **visitors** e **allowed_domains**. Se já existir linha com o mesmo `id` (ou `key` em settings), ele ignora (não duplica).

**Não precisa dar acesso ao Supabase para ninguém:** você só cola a connection string na sua máquina e roda o comando. Nada disso precisa ser feito por outra pessoa “em comandos” no seu lugar — você executa no seu PC.

---

## 5. Apontar o app no Railway para o Supabase

1. No **Railway** → seu projeto → serviço do app → **Variables**.
2. Adicione:  
   **Nome:** `DATABASE_URL`  
   **Valor:** a mesma connection string do Supabase (passo 2).
3. **Redeploy** do serviço.

A partir daí o app usa o Supabase. Se você rodou o script de migração, os dados já estão lá.

---

## 6. (Opcional) Múltiplas réplicas

Com `DATABASE_URL` apontando para o Supabase, você pode aumentar o número de **réplicas** do serviço no Railway (Settings → Scaling). Todas as instâncias usam o mesmo banco no Supabase.

---

## Resumo

| O que | Onde |
|-------|------|
| Criar projeto e pegar connection string | Supabase (você) |
| Backup dos dados atuais | Painel do site → Download backup (JSON) |
| Migrar JSON → Supabase | Seu PC: `DATABASE_URL=... node scripts/migrate-json-to-pg.js backup.json` |
| App usar Supabase | Railway: variável `DATABASE_URL` + redeploy |

Tudo pode ser feito por você, sem precisar dar acesso a terceiros; os únicos "comandos" são no seu ambiente (PowerShell/terminal) com o arquivo de backup que você baixou.

---

## 7. Reduzir uso (cota / bandwidth) sem pagar mais

Se o Supabase avisar que você passou da cota (ex.: bandwidth > 5 GB), dá para reduzir consumo **sem upgrade**:

1. **Retenção de visitantes** — O app apaga automaticamente visitantes com mais de **90 dias** (padrão). No Railway → Variables: `VISITOR_RETENTION_DAYS` = `90` (ou `60`, `30`; use `0` para desativar).
2. **Limpeza manual (admin)** — `POST /api/admin/cleanup-visitors` com sessão de admin executa a limpeza na hora.
3. **Painel do Supabase** — Em Usage/Dashboard veja o que mais consome e ajuste a retenção ou limpe dados antigos pelo painel do app.
