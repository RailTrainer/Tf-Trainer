-- ==============================================================================
-- RAILTRAINER SUPABASE CLOUD DATABASE SCHEMA
-- Ausführen im Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- ==============================================================================

-- 1. BENUTZER (USERS)
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' (Schüler), 'admin' (Ausbilder), 'moderator' (Prüfer)
  title TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. FACH-GRUPPENCHAT (CHAT_MESSAGES)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  text TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Allgemein',
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. AUSBILDER-SUPPORTCHAT (SUPPORT_MESSAGES)
CREATE TABLE IF NOT EXISTS public.support_messages (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  sender_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT NOT NULL DEFAULT 'user',
  text TEXT NOT NULL,
  image_url TEXT,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PRÜFUNGSERGEBNISSE & STATISTIKEN (QUIZ_ATTEMPTS)
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  date TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. NEWS & MITTEILUNGEN DER AUSBILDER (NEWS_ITEMS)
CREATE TABLE IF NOT EXISTS public.news_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'update',
  author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'admin',
  author_title TEXT,
  created_at BIGINT NOT NULL
);

-- 6. CHAT-MODERATION & MELDUNGEN (REPORTED_MESSAGES)
CREATE TABLE IF NOT EXISTS public.reported_messages (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  message_text TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  category TEXT NOT NULL,
  message_timestamp BIGINT NOT NULL,
  reported_by_id TEXT NOT NULL,
  reported_by_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
  created_at BIGINT NOT NULL
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_chat_messages_category ON public.chat_messages(category);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON public.chat_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_student ON public.support_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_timestamp ON public.support_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_news_items_created ON public.news_items(created_at DESC);

-- INITIALER DEFAULT-ADMIN
INSERT INTO public.users (id, name, email, password, role, title)
VALUES (
  'admin-default-id',
  'Administrator',
  'admin@railtrainer.de',
  'Annilynn215524!-',
  'admin',
  'Hauptausbilder & Prüfer'
)
ON CONFLICT (email) DO NOTHING;

-- Initialer Test-Schüler
INSERT INTO public.users (id, name, email, password, role, title)
VALUES (
  'user-default-id',
  'Tf-Anwärter Dennis',
  'schueler@railtrainer.de',
  'Schueler123!',
  'user',
  'Triebfahrzeugführer i.A.'
)
ON CONFLICT (email) DO NOTHING;
