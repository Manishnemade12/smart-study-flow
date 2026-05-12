-- =============================================================================
-- Daily Quiz Scheduler using pg_cron
-- Runs daily at 12:00 PM IST (06:30 AM UTC)
-- =============================================================================

-- IMPORTANT:
-- 1) If you are deploying on Vercel, DO NOT run this migration.
--    Use Vercel cron via vercel.json + /api/cron/generate-daily-quiz.
-- 2) Run this migration only when you want Supabase pg_cron based scheduling.

-- First, enable pg_cron extension (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a scheduled job that calls generate-daily-quiz function every day at 06:30 UTC (12:00 PM IST)
-- Run this SQL once to set up the cron job:

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron could not be created in this environment. Skipping scheduler setup.';
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS http;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'http extension could not be created in this environment. Skipping scheduler setup.';
  END;

  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-quizzes') THEN
      PERFORM cron.unschedule('generate-daily-quizzes');
    END IF;

    PERFORM cron.schedule(
      'generate-daily-quizzes',
      '30 6 * * *', -- Every day at 06:30 UTC (12:00 PM IST)
      $cron$
      SELECT http_post(
        concat(
          (SELECT value FROM decrypted_app_config WHERE key = 'SUPABASE_URL'),
          '/functions/v1/generate-daily-quiz'
        ),
        '{}',
        'application/json'
      );
      $cron$
    );

    RAISE NOTICE 'pg_cron job generate-daily-quizzes scheduled successfully.';
  ELSE
    RAISE NOTICE 'cron schema not found. If using Vercel, ignore this. If using Supabase cron, enable pg_cron first.';
  END IF;
END
$$;

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To see job logs:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- To delete a job if needed:
-- SELECT cron.unschedule('generate-daily-quizzes');

-- ALTERNATIVE: If using HTTP endpoint (for Vercel/external services)
-- You can also use a service like:
-- - GitHub Actions (cron-based workflow)
-- - AWS EventBridge
-- - Google Cloud Scheduler
-- - Vercel Cron Functions (in API routes)

-- Example for Vercel Cron (in API route):
-- export const config = {
--   maxDuration: 60,
-- };
-- 
-- export default async (req, res) => {
--   if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
--     return res.status(401).json({ success: false });
--   }
--   // Call generate-daily-quiz function
-- };
