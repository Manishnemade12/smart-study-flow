
-- Weak questions: every wrong answer is recorded for revision
CREATE TABLE public.weak_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject_id uuid NOT NULL,
  question_hash text NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer text NOT NULL,
  explanation text,
  times_wrong integer NOT NULL DEFAULT 0,
  times_correct integer NOT NULL DEFAULT 0,
  last_wrong_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  mastered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id, question_hash)
);

CREATE INDEX idx_weak_questions_user_subject ON public.weak_questions (user_id, subject_id, mastered);
CREATE INDEX idx_weak_questions_priority ON public.weak_questions (user_id, subject_id, times_wrong DESC, last_wrong_at DESC);

ALTER TABLE public.weak_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weak_q own select" ON public.weak_questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weak_q own insert" ON public.weak_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weak_q own update" ON public.weak_questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weak_q own delete" ON public.weak_questions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER weak_questions_touch BEFORE UPDATE ON public.weak_questions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- User streak tracker
CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  total_quizzes_completed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streak own select" ON public.user_streaks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "streak own insert" ON public.user_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "streak own update" ON public.user_streaks FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER user_streaks_touch BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
