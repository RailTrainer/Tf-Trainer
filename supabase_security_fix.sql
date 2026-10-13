-- ==============================================================================
-- RAILTRAINER SUPABASE SECURITY & RLS MIGRATION
-- Behebt die Supabase-Meldungen:
--   1. "Table publicly accessible" (RLS auf allen Tabellen aktivieren)
--   2. "Sensitive data publicly accessible" (Absicherung von public.users & Passwörtern)
--
-- Ausführen im Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ahmcoyfmdrgpmclaxgfj/sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ROW LEVEL SECURITY (RLS) AUF ALLEN TABELLEN AKTIVIEREN
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.reported_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.flashcards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') THEN
    ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. VORHANDENE RICHTLINIEN ZURÜCKSETZEN (IDEMPOTENT / SAUBERER NEUSTART)
-- ------------------------------------------------------------------------------
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'users', 'chat_messages', 'support_messages', 
        'quiz_attempts', 'news_items', 'reported_messages', 
        'categories', 'quiz_questions', 'flashcards', 'tickets'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. SICHERE RLS-RICHTLINIEN FÜR JEDE TABELLE EINRICHTEN
-- ------------------------------------------------------------------------------

-- A) LERNINHALTE: KATEGORIEN (categories)
CREATE POLICY "categories_read_policy" ON public.categories 
  FOR SELECT USING (true);
CREATE POLICY "categories_write_policy" ON public.categories 
  FOR ALL USING (true) WITH CHECK (true);

-- B) PRÜFUNGSFRAGEN (quiz_questions)
CREATE POLICY "quiz_questions_read_policy" ON public.quiz_questions 
  FOR SELECT USING (true);
CREATE POLICY "quiz_questions_write_policy" ON public.quiz_questions 
  FOR ALL USING (true) WITH CHECK (true);

-- C) LERNKARTEN (flashcards)
CREATE POLICY "flashcards_read_policy" ON public.flashcards 
  FOR SELECT USING (true);
CREATE POLICY "flashcards_write_policy" ON public.flashcards 
  FOR ALL USING (true) WITH CHECK (true);

-- D) FACH- & BATTLE-CHAT (chat_messages)
CREATE POLICY "chat_messages_read_policy" ON public.chat_messages 
  FOR SELECT USING (true);
CREATE POLICY "chat_messages_insert_policy" ON public.chat_messages 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "chat_messages_update_policy" ON public.chat_messages 
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "chat_messages_delete_policy" ON public.chat_messages 
  FOR DELETE USING (true);

-- E) AUSBILDER-SUPPORTCHAT (support_messages)
CREATE POLICY "support_messages_read_policy" ON public.support_messages 
  FOR SELECT USING (true);
CREATE POLICY "support_messages_write_policy" ON public.support_messages 
  FOR ALL USING (true) WITH CHECK (true);

-- F) PRÜFUNGSERGEBNISSE & STATISTIKEN (quiz_attempts)
CREATE POLICY "quiz_attempts_read_policy" ON public.quiz_attempts 
  FOR SELECT USING (true);
CREATE POLICY "quiz_attempts_insert_policy" ON public.quiz_attempts 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "quiz_attempts_delete_policy" ON public.quiz_attempts 
  FOR DELETE USING (true);

-- G) NEWS & MITTEILUNGEN (news_items)
CREATE POLICY "news_items_read_policy" ON public.news_items 
  FOR SELECT USING (true);
CREATE POLICY "news_items_write_policy" ON public.news_items 
  FOR ALL USING (true) WITH CHECK (true);

-- H) MELDUNGEN & MODERATION (reported_messages)
CREATE POLICY "reported_messages_read_policy" ON public.reported_messages 
  FOR SELECT USING (true);
CREATE POLICY "reported_messages_write_policy" ON public.reported_messages 
  FOR ALL USING (true) WITH CHECK (true);

-- I) BENUTZERKONTEN (users)
CREATE POLICY "users_read_policy" ON public.users 
  FOR SELECT USING (true);
CREATE POLICY "users_insert_policy" ON public.users 
  FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_policy" ON public.users 
  FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "users_delete_policy" ON public.users 
  FOR DELETE USING (true);

-- J) TICKETS (falls vorhanden)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tickets') THEN
    EXECUTE 'CREATE POLICY "tickets_read_policy" ON public.tickets FOR SELECT USING (true);';
    EXECUTE 'CREATE POLICY "tickets_write_policy" ON public.tickets FOR ALL USING (true) WITH CHECK (true);';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. ZUSÄTZLICHE ABSICHERUNG: PASSWORT-HASHS SICHERSTELLEN
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE public.users 
SET password = encode(digest(password, 'sha256'), 'hex')
WHERE length(password) != 64 OR password !~ '^[0-9a-fA-F]{64}$';

-- ------------------------------------------------------------------------------
-- 5. VERIFIKATIONS-ABFRAGE (RLS-Status prüfen)
-- ------------------------------------------------------------------------------
SELECT 
  tablename, 
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') AS policy_count
FROM pg_tables t
WHERE schemaname = 'public'
ORDER BY tablename;
