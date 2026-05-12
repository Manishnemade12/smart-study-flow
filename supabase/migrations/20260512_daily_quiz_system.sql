-- =============================================================================
-- Daily Quiz System Tables
-- Scheduled daily quizzes for each subject (12 PM IST daily)
-- =============================================================================

-- =====================================================================
-- daily_quizzes: Store one quiz per subject per day
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.daily_quizzes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  subject_id        uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  quiz_date         date NOT NULL,  -- YYYY-MM-DD for the day this quiz is for
  questions         jsonb NOT NULL DEFAULT '[]'::jsonb,  -- array of quiz questions (MCQ format)
  total_questions   integer NOT NULL DEFAULT 0,
  difficulty        text NOT NULL DEFAULT 'medium',  -- easy | medium | hard
  source            text NOT NULL DEFAULT 'ai',  -- 'ai' | 'pyq' | 'manual'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id, quiz_date)
);

CREATE INDEX IF NOT EXISTS daily_quizzes_user_id_idx ON public.daily_quizzes(user_id);
CREATE INDEX IF NOT EXISTS daily_quizzes_subject_id_idx ON public.daily_quizzes(subject_id);
CREATE INDEX IF NOT EXISTS daily_quizzes_date_idx ON public.daily_quizzes(quiz_date);
CREATE INDEX IF NOT EXISTS daily_quizzes_user_date_idx ON public.daily_quizzes(user_id, quiz_date);

ALTER TABLE public.daily_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_quiz own select" ON public.daily_quizzes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_quiz own insert" ON public.daily_quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_quiz own update" ON public.daily_quizzes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "daily_quiz own delete" ON public.daily_quizzes
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS daily_quizzes_touch_updated_at ON public.daily_quizzes;
CREATE TRIGGER daily_quizzes_touch_updated_at
  BEFORE UPDATE ON public.daily_quizzes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================================
-- daily_quiz_attempts: Track user attempts and scores
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.daily_quiz_attempts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL,
  daily_quiz_id     uuid NOT NULL REFERENCES public.daily_quizzes(id) ON DELETE CASCADE,
  subject_id        uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  quiz_date         date NOT NULL,
  answers           jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{question_idx, selected_answer, is_correct}, ...]
  score             integer NOT NULL DEFAULT 0,  -- out of total_questions
  total_questions   integer NOT NULL DEFAULT 0,
  percentage        numeric(5,2) NOT NULL DEFAULT 0,  -- percentage score
  time_taken        integer,  -- seconds
  completed         boolean NOT NULL DEFAULT false,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_attempts_user_id_idx ON public.daily_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS daily_attempts_quiz_id_idx ON public.daily_quiz_attempts(daily_quiz_id);
CREATE INDEX IF NOT EXISTS daily_attempts_subject_idx ON public.daily_quiz_attempts(subject_id);
CREATE INDEX IF NOT EXISTS daily_attempts_date_idx ON public.daily_quiz_attempts(quiz_date);

ALTER TABLE public.daily_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_attempt own select" ON public.daily_quiz_attempts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_attempt own insert" ON public.daily_quiz_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_attempt own update" ON public.daily_quiz_attempts
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS daily_attempts_touch_updated_at ON public.daily_quiz_attempts;
CREATE TRIGGER daily_attempts_touch_updated_at
  BEFORE UPDATE ON public.daily_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Calculate percentage before insert/update
CREATE OR REPLACE FUNCTION public.calculate_daily_quiz_percentage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.total_questions > 0 THEN
    NEW.percentage = ROUND((NEW.score::numeric / NEW.total_questions) * 100, 2);
  ELSE
    NEW.percentage = 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS daily_attempts_calc_percentage ON public.daily_quiz_attempts;
CREATE TRIGGER daily_attempts_calc_percentage
  BEFORE INSERT OR UPDATE ON public.daily_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.calculate_daily_quiz_percentage();

-- =====================================================================
-- daily_quiz_config: User preferences for daily quizzes
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.daily_quiz_config (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL UNIQUE,
  enabled           boolean NOT NULL DEFAULT true,
  schedule_time     time NOT NULL DEFAULT '12:00:00',  -- 12:00 PM IST
  timezone          text NOT NULL DEFAULT 'Asia/Kolkata',
  difficulty        text NOT NULL DEFAULT 'medium',  -- easy | medium | hard | mixed
  include_pyq       boolean NOT NULL DEFAULT true,  -- Include Previous Year Questions
  num_questions     integer NOT NULL DEFAULT 10,  -- Questions per quiz per subject
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS daily_config_user_id_idx ON public.daily_quiz_config(user_id);

ALTER TABLE public.daily_quiz_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_config own select" ON public.daily_quiz_config
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "daily_config own insert" ON public.daily_quiz_config
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_config own update" ON public.daily_quiz_config
  FOR UPDATE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS daily_config_touch_updated_at ON public.daily_quiz_config;
CREATE TRIGGER daily_config_touch_updated_at
  BEFORE UPDATE ON public.daily_quiz_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-create daily_quiz_config when user signs up
CREATE OR REPLACE FUNCTION public.handle_daily_quiz_config()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.daily_quiz_config (user_id)
  VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_daily_config ON public.profiles;
CREATE TRIGGER on_profile_created_daily_config
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_daily_quiz_config();

-- =====================================================================
-- View: User's today's quiz status
-- =====================================================================
CREATE OR REPLACE VIEW public.today_quiz_status AS
SELECT
  dq.user_id,
  dq.subject_id,
  s.name as subject_name,
  dq.id as quiz_id,
  dq.total_questions,
  dq.difficulty,
  COUNT(CASE WHEN dda.completed THEN 1 END)::integer as attempts_completed,
  COALESCE(MAX(dda.percentage), 0) as best_score,
  COALESCE(MAX(dda.completed_at), NULL) as last_attempt_at,
  CASE WHEN COUNT(CASE WHEN dda.completed THEN 1 END) > 0 THEN true ELSE false END as is_attempted
FROM
  public.daily_quizzes dq
  JOIN public.subjects s ON dq.subject_id = s.id
  LEFT JOIN public.daily_quiz_attempts dda ON dq.id = dda.daily_quiz_id AND dda.completed = true
WHERE
  dq.quiz_date = CURRENT_DATE
GROUP BY
  dq.user_id, dq.subject_id, s.name, dq.id, dq.total_questions, dq.difficulty;

-- =====================================================================
-- View: User's daily quiz statistics (last 7 days)
-- =====================================================================
CREATE OR REPLACE VIEW public.daily_quiz_stats_7days AS
SELECT
  dda.user_id,
  dda.subject_id,
  s.name as subject_name,
  dda.quiz_date,
  COUNT(*)::integer as attempts,
  AVG(dda.percentage) as avg_percentage,
  MAX(dda.percentage) as best_score,
  MIN(dda.percentage) as worst_score
FROM
  public.daily_quiz_attempts dda
  JOIN public.subjects s ON dda.subject_id = s.id
WHERE
  dda.quiz_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY
  dda.user_id, dda.subject_id, s.name, dda.quiz_date;
