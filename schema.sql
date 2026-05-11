-- =============================================================================
-- SSC Smart Notes — Full database schema
-- Single-file definition of all tables, policies, functions and triggers.
-- Apply with: psql "$DATABASE_URL" -f schema.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Helper: updated_at touch trigger function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL UNIQUE,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own profile insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own profile update" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create a profile row on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- subjects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS subjects_user_id_idx ON public.subjects(user_id);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subjects own select" ON public.subjects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subjects own insert" ON public.subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subjects own update" ON public.subjects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subjects own delete" ON public.subjects
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS subjects_touch_updated_at ON public.subjects;
CREATE TRIGGER subjects_touch_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- chunks  (hierarchical: parent_chunk_id self-references chunks.id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chunks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  subject_id       uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  parent_chunk_id  uuid REFERENCES public.chunks(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Untitled',
  summary          text NOT NULL DEFAULT '',
  notes            text NOT NULL DEFAULT '',
  key_points       jsonb NOT NULL DEFAULT '[]'::jsonb,
  terms            jsonb NOT NULL DEFAULT '[]'::jsonb,
  "order"          integer NOT NULL DEFAULT 0,
  revised          boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chunks_user_id_idx          ON public.chunks(user_id);
CREATE INDEX IF NOT EXISTS chunks_subject_id_idx       ON public.chunks(subject_id);
CREATE INDEX IF NOT EXISTS chunks_parent_chunk_id_idx  ON public.chunks(parent_chunk_id);

ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chunks own select" ON public.chunks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chunks own insert" ON public.chunks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chunks own update" ON public.chunks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chunks own delete" ON public.chunks
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS chunks_touch_updated_at ON public.chunks;
CREATE TRIGGER chunks_touch_updated_at
  BEFORE UPDATE ON public.chunks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- quiz_questions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL,
  chunk_id     uuid NOT NULL REFERENCES public.chunks(id) ON DELETE CASCADE,
  type         text NOT NULL,                 -- 'mcq' | 'true_false' | 'one_line'
  question     text NOT NULL,
  options      jsonb,                         -- array of strings for mcq
  answer       text NOT NULL,
  explanation  text,
  "order"      integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_questions_user_id_idx  ON public.quiz_questions(user_id);
CREATE INDEX IF NOT EXISTS quiz_questions_chunk_id_idx ON public.quiz_questions(chunk_id);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz own select" ON public.quiz_questions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quiz own insert" ON public.quiz_questions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz own update" ON public.quiz_questions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quiz own delete" ON public.quiz_questions
  FOR DELETE USING (auth.uid() = user_id);