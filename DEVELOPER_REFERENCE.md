# Daily Quiz System - Developer Reference

## 🔌 API Endpoints

### Generate Daily Quizzes (Edge Function)
```
POST /functions/v1/generate-daily-quiz
Headers: 
  - Content-Type: application/json
  - Authorization: Bearer [SUPABASE_KEY]

Response:
{
  "success": true,
  "generated": 45,
  "failed": 3
}
```

## 📊 Database Queries

### Get Today's Quiz Status for All Subjects
```sql
SELECT * FROM today_quiz_status 
WHERE user_id = 'current_user_id';
```

### Get User's Quiz Configuration
```sql
SELECT * FROM daily_quiz_config 
WHERE user_id = 'current_user_id';
```

### Get Specific Quiz
```sql
SELECT * FROM daily_quizzes
WHERE user_id = 'current_user_id'
  AND subject_id = 'subject_id'
  AND quiz_date = CURRENT_DATE;
```

### Get Last 5 Quiz Attempts for Subject
```sql
SELECT * FROM daily_quiz_attempts
WHERE user_id = 'current_user_id'
  AND subject_id = 'subject_id'
  AND completed = true
ORDER BY completed_at DESC
LIMIT 5;
```

### Get 7-Day Performance Stats
```sql
SELECT * FROM daily_quiz_stats_7days
WHERE user_id = 'current_user_id'
ORDER BY quiz_date DESC;
```

## 🗂️ Database Indexes

```sql
-- For fast queries on user's quizzes
daily_quizzes_user_id_idx
daily_quizzes_user_date_idx

-- For quiz attempts
daily_attempts_user_id_idx
daily_attempts_date_idx

-- For config lookups
daily_config_user_id_idx
```

## 🔄 Data Structures

### Daily Quiz JSON Structure
```json
{
  "questions": [
    {
      "question": "What is the capital of India?",
      "type": "mcq",
      "options": ["Delhi", "Mumbai", "Bangalore", "Chennai"],
      "answer": "Delhi",
      "explanation": "New Delhi is the capital of India."
    }
  ]
}
```

### Quiz Attempt Answers JSON
```json
{
  "answers": [
    {
      "questionIdx": 0,
      "selectedAnswer": "Delhi",
      "isCorrect": true
    },
    {
      "questionIdx": 1,
      "selectedAnswer": "Mumbai",
      "isCorrect": false
    }
  ]
}
```

## 🧮 Scoring Logic

```typescript
// In PostgreSQL Trigger:
percentage = ROUND((score / total_questions) * 100, 2)

// Grade Mapping:
90-100 → A+ (Excellent)
80-89  → A  (Great Job)
70-79  → B  (Good)
60-69  → C  (Okay)
<60    → F  (Keep Practicing)
```

## ⏰ Cron Schedule

```
Standard Cron: 30 6 * * *
Translation: 06:30 UTC daily = 12:00 PM IST

Timezone Conversion:
- UTC:         06:30
- IST (+5:30): 12:00 PM
- EST (-5:00): 01:30 AM
- PST (-8:00): 10:30 PM (previous day)
```

## 🚀 Frontend Query Patterns

### React Query Hooks

```typescript
// Get today's quizzes
const { data: quizzes } = useQuery({
  queryKey: ["today-quiz-status", today],
  queryFn: () => supabase.from("today_quiz_status").select("*")
});

// Get specific quiz
const { data: quiz } = useQuery({
  queryKey: ["daily-quiz", subjectId, today],
  queryFn: () => supabase
    .from("daily_quizzes")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("quiz_date", today)
    .single()
});

// Submit quiz attempt
const mutation = useMutation({
  mutationFn: () => supabase
    .from("daily_quiz_attempts")
    .insert({...attemptData})
});
```

## 🔐 RLS Policies

All tables have RLS enabled:
```sql
-- SELECT: Users can only view their own data
SELECT auth.uid() = user_id

-- INSERT: Users can only insert their own data
INSERT auth.uid() = user_id

-- UPDATE: Users can only update their own data
UPDATE auth.uid() = user_id

-- DELETE: Users can only delete their own data
DELETE auth.uid() = user_id
```

## 📝 Environment Variables

```
Required:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LOVABLE_API_KEY=your_ai_api_key

Optional:
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 🔧 Configuration Options

### Daily Quiz Config Defaults
```typescript
{
  enabled: true,
  schedule_time: "12:00:00",
  timezone: "Asia/Kolkata",
  difficulty: "medium",
  include_pyq: true,
  num_questions: 10
}
```

### Valid Values
```
difficulty: "easy" | "medium" | "hard" | "mixed"
timezone: Any valid IANA timezone
num_questions: 5-50
source: "ai" | "pyq" | "manual"
```

## 📈 Performance Considerations

### Table Sizes (Estimate)
```
daily_quizzes: ~100 KB per 100 users per month
  = ~3 MB per 100 users per year

daily_quiz_attempts: ~500 KB-1 MB per 100 users per month
  = ~10-15 MB per 100 users per year

daily_quiz_config: ~10 KB (constant size per user)
```

### Query Optimization
- Always filter by `user_id` first (indexed)
- Use `quiz_date` index for date-based queries
- Limit results for attempts history
- Use views for aggregated data

## 🐛 Debugging Tips

### Check Scheduler Status
```sql
-- View all jobs
SELECT * FROM cron.job;

-- View job runs
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC LIMIT 10;

-- View errors
SELECT * FROM cron.job_run_details 
WHERE status = 'failed' 
ORDER BY start_time DESC LIMIT 5;
```

### Test Quiz Generation Manually
```bash
# Trigger immediately
curl -X POST \
  https://[PROJECT_ID].supabase.co/functions/v1/generate-daily-quiz \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{}'

# Check logs
supabase functions logs generate-daily-quiz
```

### Verify RLS Policies
```sql
-- Check RLS enabled
SELECT * FROM pg_tables 
WHERE tablename IN (
  'daily_quizzes',
  'daily_quiz_attempts', 
  'daily_quiz_config'
);

-- Test policy with role
SELECT auth.uid(); -- Should return user ID in session
```

## 📊 Analytics Queries

### Most Difficult Subjects (Lowest Scores)
```sql
SELECT 
  subject_id,
  subject_name,
  ROUND(AVG(percentage), 2) as avg_score
FROM daily_quiz_stats_7days
WHERE user_id = 'current_user_id'
GROUP BY subject_id, subject_name
ORDER BY avg_score ASC;
```

### Daily Progress Trend
```sql
SELECT 
  quiz_date,
  ROUND(AVG(avg_percentage), 2) as daily_avg
FROM daily_quiz_stats_7days
WHERE user_id = 'current_user_id'
GROUP BY quiz_date
ORDER BY quiz_date DESC;
```

### Total Quizzes Taken
```sql
SELECT 
  COUNT(*) as total_attempts,
  COUNT(DISTINCT quiz_date) as days_with_attempts,
  ROUND(AVG(percentage), 2) as overall_average
FROM daily_quiz_attempts
WHERE user_id = 'current_user_id' 
  AND completed = true;
```

## 🔄 Migration Rollback

If needed:
```sql
-- Drop tables (caution!)
DROP TABLE IF EXISTS public.daily_quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.daily_quizzes CASCADE;
DROP TABLE IF EXISTS public.daily_quiz_config CASCADE;

-- Or just truncate (keep schema)
TRUNCATE TABLE public.daily_quiz_attempts CASCADE;
```

## 📱 Mobile Considerations

- Quiz UI is fully responsive
- Touch-optimized radio buttons
- Readable question text
- Progress bar visible
- Navigation buttons large enough

## ♻️ Automatic Cleanup

Currently: No automatic cleanup
Consider adding:
- Archive old attempts (>6 months)
- Delete old quizzes (>1 year)
- Optimize JSON size

---

**Last Updated:** May 12, 2026
**Version:** 1.0
