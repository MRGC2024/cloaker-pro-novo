-- =============================================================================
-- Supabase RLS (Row Level Security) - Corrigir avisos do linter
-- Execute este script no Supabase: SQL Editor > New query > Cole e Run
-- =============================================================================
--
-- O QUE É RLS?
-- Row Level Security restringe quais linhas cada usuário pode ver/editar.
-- O Supabase exige RLS em tabelas do schema 'public' porque elas são
-- expostas ao PostgREST (API). Sem RLS, quem usar a chave 'anon' poderia
-- acessar todos os dados.
--
-- SEU APP CONTINUA FUNCIONANDO?
-- Sim. Seu Cloaker usa DATABASE_URL (conexão direta PostgreSQL). O usuário
-- 'postgres' do Supabase tem privilégio BYPASSRLS, ou seja, ignora o RLS.
-- O app Node.js continuará acessando os dados normalmente.
--
-- O que muda: acesso via API do Supabase (chave anon) ficará bloqueado,
-- o que é o comportamento seguro esperado.
-- =============================================================================

-- Habilitar RLS em todas as tabelas do schema public
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_reviewer_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggested_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learned_bot_patterns ENABLE ROW LEVEL SECURITY;

-- Políticas: permitem apenas o role 'postgres' (usado pelo seu app via DATABASE_URL).
-- O role 'anon' (API pública do Supabase) continua sem acesso. Execute uma vez.
-- Se alguma tabela não existir (ex: session), comente a linha correspondente.

CREATE POLICY "backend_only_sites" ON public.sites FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_settings" ON public.settings FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_users" ON public.users FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_allowed_domains" ON public.allowed_domains FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_session" ON public.session FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_landing_pages" ON public.landing_pages FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_meta_reviewer_ips" ON public.meta_reviewer_ips FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_visitors" ON public.visitors FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_suggested_improvements" ON public.suggested_improvements FOR ALL TO postgres USING (true) WITH CHECK (true);
CREATE POLICY "backend_only_learned_bot_patterns" ON public.learned_bot_patterns FOR ALL TO postgres USING (true) WITH CHECK (true);
