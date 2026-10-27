-- ==============================================================================
-- RAILTRAINER SUPABASE EXTENSION: FRAGEN, LERNKARTEN & KATEGORIEN
-- Im Supabase SQL Editor ausführen: https://supabase.com/dashboard/project/ahmcoyfmdrgpmclaxgfj/sql
-- ==============================================================================

-- 1. KATEGORIEN (CATEGORIES)
CREATE TABLE IF NOT EXISTS public.categories (
  name TEXT PRIMARY KEY,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#22c55e',
  icon TEXT DEFAULT 'BookOpen',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PRÜFUNGSFRAGEN (QUIZ_QUESTIONS)
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  text TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  danger_indices JSONB NOT NULL DEFAULT '[]'::jsonb,
  explanation TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. LERNKARTEN & WISSEN (FLASHCARDS)
CREATE TABLE IF NOT EXISTS public.flashcards (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reference TEXT DEFAULT '',
  image_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PUSH-TOKENS, 4-AUGEN-PRINZIP & MULTIPLE CHOICE MIGRATION
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_token TEXT DEFAULT '';
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS creator_role TEXT;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS updated_by_name TEXT;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.flashcards ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS correct_indices JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS danger_indices JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS created_by_name TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS creator_role TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS updated_by TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS updated_by_name TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS verified_by TEXT;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS verified_by_name TEXT;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & ÖFFENTLICHE ZUGRIFFSREGELN
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all on categories') THEN
    CREATE POLICY "Allow public all on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all on quiz_questions') THEN
    CREATE POLICY "Allow public all on quiz_questions" ON public.quiz_questions FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all on flashcards') THEN
    CREATE POLICY "Allow public all on flashcards" ON public.flashcards FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Indizes für schnelle Filterung nach Kategorie
CREATE INDEX IF NOT EXISTS idx_quiz_questions_category ON public.quiz_questions(category);
CREATE INDEX IF NOT EXISTS idx_flashcards_category ON public.flashcards(category);
