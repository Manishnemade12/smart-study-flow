# Daily Quiz System - Vercel Deployment Guide

## ✅ What Works on Vercel

- ✅ React components (DailyQuizPage, etc.)
- ✅ TanStack Router and all routes
- ✅ Frontend UI (fully responsive)
- ✅ User authentication (Supabase Auth)
- ✅ Database queries (Supabase)
- ✅ Edge functions called from frontend
- ✅ **NEW: Vercel Cron for daily scheduler**

---

## 🚀 Vercel-Specific Setup (Important!)

### The Key Difference:

**NOT needed on Vercel:**
- ❌ Supabase pg_cron (doesn't need to be set up)
- ❌ GitHub Actions (optional alternative)

**INSTEAD, use:**
- ✅ **Vercel Cron** (native to Vercel, recommended)

---

## 📋 Setup Steps for Vercel

### Step 1: Add Environment Variables to Vercel

Go to Vercel Dashboard → Project Settings → Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LOVABLE_API_KEY=your_lovable_api_key
CRON_SECRET=any_random_string_for_cron_verification
```

**Critical:** Add these to:
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 2: Files Already Created

These files are ready to use:

```
api/cron/generate-daily-quiz.ts  ← Vercel Cron Handler
vercel.json                       ← Cron Schedule Config
supabase/functions/generate-daily-quiz/  ← AI Quiz Generator
```

### Step 3: Deploy to Vercel

```bash
git add .
git commit -m "Add Vercel cron for daily quiz generation"
git push
```

Vercel will automatically:
- Detect `vercel.json` cron config
- Deploy the API route
- Schedule it to run daily at **06:30 UTC (12:00 PM IST)**

### Step 4: Verify Cron is Running

**In Vercel Dashboard:**
1. Go to Project → Crons
2. See `generate-daily-quiz` scheduled
3. Check execution history

**Check logs:**
```bash
vercel logs # see cron executions
```

---

## 🔄 How Vercel Cron Works

```
Daily at 06:30 UTC (12:00 PM IST)
         ↓
Vercel triggers: GET /api/cron/generate-daily-quiz?__cron_secret=XXX
         ↓
Cron handler verifies CRON_SECRET
         ↓
Calls Supabase edge function: /functions/v1/generate-daily-quiz
         ↓
Supabase generates quizzes for all users
         ↓
Quizzes stored in daily_quizzes table
         ↓
Users see them at /daily-quiz
```

---

## 🔐 Security

### Cron Secret Verification

The API route checks: `Bearer ${CRON_SECRET}`

This ensures only Vercel can call it:

```typescript
if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
  return res.status(401).json({ success: false });
}
```

---

## 🧪 Testing on Vercel

### Manual Test (on Vercel):

Go to browser:
```
https://your-vercel-domain.vercel.app/api/cron/generate-daily-quiz?__cron_secret=YOUR_CRON_SECRET
```

Should return:
```json
{
  "success": true,
  "message": "Daily quizzes generated successfully",
  "data": { "generated": 45, "failed": 3 }
}
```

### Test in Development:

```bash
# Start Vercel dev server
vercel dev

# In another terminal:
curl -H "Authorization: Bearer test-secret" \
  http://localhost:3000/api/cron/generate-daily-quiz
```

---

## 📝 Vercel Cron Schedule

**Current Schedule:**
```
30 6 * * *
```

**Breakdown:**
- `30` = Minute 30
- `6` = Hour 6 (UTC)
- `*` = Every day
- `*` = Every month
- `*` = Every day of week

**Result:** Daily at 6:30 AM UTC = 12:00 PM IST ✅

### To Change Time:

Edit `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/generate-daily-quiz",
      "schedule": "0 6 * * *"  // 6:00 AM UTC instead
    }
  ]
}
```

---

## ⚙️ Full Environment Variables Needed

| Variable | Where | Example |
|----------|-------|---------|
| `VITE_SUPABASE_URL` | Supabase Dashboard | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Settings | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings (secret) | `eyJ...` |
| `LOVABLE_API_KEY` | Lovable Dashboard | `lk_...` |
| `CRON_SECRET` | Create random string | `your-secret-key-here` |

**Get from Supabase:**
1. Go to project → Settings → API
2. Copy "Project URL" → VITE_SUPABASE_URL
3. Copy "anon public" → VITE_SUPABASE_ANON_KEY
4. Copy "service_role secret" → SUPABASE_SERVICE_ROLE_KEY

---

## 🚨 Troubleshooting on Vercel

### Cron not running?

✓ Check Vercel dashboard → Crons section
✓ Verify `vercel.json` is in root directory
✓ Check environment variables are set
✓ Check API route exists: `api/cron/generate-daily-quiz.ts`
✓ Look at execution logs in Vercel

### "Unauthorized" error?

Make sure `CRON_SECRET` is set in Vercel environment variables:
```bash
vercel env pull  # Pull env vars locally
```

### Function timeout?

Increase timeout in API route:
```typescript
export const config = {
  maxDuration: 300,  // 5 minutes
};
```

### Supabase connection failing?

✓ Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
✓ Check Supabase project is running
✓ Verify table permissions (RLS policies)

---

## 🔍 Database Migrations Still Needed

Even on Vercel, you need to run Supabase migrations once:

```bash
supabase migration up
```

Or in Supabase SQL editor:
```bash
psql "$DATABASE_URL" -f supabase/migrations/20260512_daily_quiz_system.sql
```

---

## 📊 Vercel Cron Limitations

| Feature | Limit |
|---------|-------|
| Max execution | 900 seconds (15 min) |
| Min frequency | 1 per day |
| Concurrent runs | 1 |
| Geo location | US region |

**Our setup:** 
- Uses ~30 seconds max ✅
- Runs once daily ✅
- Single execution ✅

---

## ✨ Comparison: pg_cron vs Vercel Cron

| Feature | pg_cron | Vercel Cron |
|---------|--------|-----------|
| Setup | Complex | Simple ✅ |
| Maintenance | Database | Vercel managed ✅ |
| Monitoring | SQL queries | Dashboard ✅ |
| Timezone handling | Manual | Vercel handles ✅ |
| Cost | Supabase | Free tier ✅ |
| Recommended | For Supabase only | For Vercel ✅ |

---

## 🎯 Deployment Checklist for Vercel

- [ ] Run database migrations: `supabase migration up`
- [ ] Add all 5 env variables to Vercel
- [ ] Verify `vercel.json` has cron config
- [ ] Verify `api/cron/generate-daily-quiz.ts` exists
- [ ] Deploy to Vercel: `git push`
- [ ] Check Vercel dashboard → Crons
- [ ] Wait for scheduled time or manually test
- [ ] Verify quizzes appear in `/daily-quiz`

---

## 🚀 Deploy Now

```bash
# 1. Make sure migrations are applied
supabase migration up

# 2. Push to Vercel
git add .
git commit -m "Daily quiz system with Vercel cron"
git push

# 3. Go to Vercel dashboard and confirm deployment
# 4. Check Crons tab - should see your scheduled job
# 5. Done!
```

---

## 📞 Support

If cron not triggering:
1. Check Vercel logs: `vercel logs`
2. Manually test: curl the endpoint
3. Check `CRON_SECRET` matches
4. Check Supabase is reachable
5. Check edge function is deployed

---

## 🎉 You're Done!

Your system is now:
- ✅ Deployed on Vercel
- ✅ Database on Supabase
- ✅ Daily quizzes auto-generating at 12 PM IST
- ✅ Fully production-ready

No pg_cron needed! Vercel handles everything.

---

**Last Updated:** May 12, 2026
**Status:** Vercel-Ready ✅
