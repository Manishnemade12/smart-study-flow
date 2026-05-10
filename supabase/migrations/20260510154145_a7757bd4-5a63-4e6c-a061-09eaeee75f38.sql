
-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Subjects
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subjects own select" ON public.subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subjects own insert" ON public.subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subjects own update" ON public.subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subjects own delete" ON public.subjects FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_subjects_user ON public.subjects(user_id);

-- Chunks
CREATE TABLE public.chunks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  parent_chunk_id UUID REFERENCES public.chunks(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled',
  "order" INT NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  terms JSONB NOT NULL DEFAULT '[]'::jsonb,
  revised BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chunks own select" ON public.chunks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "chunks own insert" ON public.chunks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chunks own update" ON public.chunks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "chunks own delete" ON public.chunks FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_chunks_user ON public.chunks(user_id);
CREATE INDEX idx_chunks_subject ON public.chunks(subject_id);
CREATE INDEX idx_chunks_parent ON public.chunks(parent_chunk_id);

-- Quiz questions
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chunk_id UUID NOT NULL REFERENCES public.chunks(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  type TEXT NOT NULL,
  options JSONB,
  answer TEXT NOT NULL,
  explanation TEXT,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz own select" ON public.quiz_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "quiz own insert" ON public.quiz_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "quiz own update" ON public.quiz_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "quiz own delete" ON public.quiz_questions FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_quiz_chunk ON public.quiz_questions(chunk_id);

-- Updated-at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_subjects_touch BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_chunks_touch BEFORE UPDATE ON public.chunks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
