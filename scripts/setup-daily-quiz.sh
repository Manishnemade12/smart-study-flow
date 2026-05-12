#!/bin/bash
# Daily Quiz System - Quick Setup Script

echo "🚀 Daily Quiz System - Quick Setup"
echo "=================================="
echo ""

# Step 1: Check if migrations exist
echo "✓ Step 1: Database Migrations"
if [ -f "supabase/migrations/20260512_daily_quiz_system.sql" ]; then
    echo "  ✅ Migration file exists"
    echo "  Run: supabase migration up"
else
    echo "  ❌ Migration file not found"
fi
echo ""

# Step 2: Check for Vercel setup
echo "✓ Step 2: Vercel Cron Setup"
if [ -f "api/cron/generate-daily-quiz.ts" ]; then
    echo "  ✅ Vercel cron API route exists"
else
    echo "  ❌ Vercel cron API route not found"
fi

if grep -q '"crons"' vercel.json 2>/dev/null; then
    echo "  ✅ vercel.json has cron configuration"
else
    echo "  ⚠️  vercel.json missing cron config"
fi
echo ""

# Step 3: Check environment variables
echo "✓ Step 3: Environment Variables"
if grep -q "LOVABLE_API_KEY" .env* 2>/dev/null; then
    echo "  ✅ LOVABLE_API_KEY configured"
else
    echo "  ⚠️  LOVABLE_API_KEY not found in .env"
fi

if grep -q "CRON_SECRET" .env* 2>/dev/null; then
    echo "  ✅ CRON_SECRET configured"
else
    echo "  ⚠️  CRON_SECRET not found in .env"
fi
echo ""

# Step 4: Check components
echo "✓ Step 4: Components & Routes"
COMPONENTS=(
  "src/components/DailyQuizPage.tsx"
  "src/components/DailyQuizCard.tsx"
  "src/components/DailyQuizContainer.tsx"
  "src/components/DailyQuizResultPage.tsx"
  "src/components/DailyQuizSettingsPage.tsx"
)
for component in "${COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    echo "  ✅ $(basename $component)"
  else
    echo "  ❌ $(basename $component) not found"
  fi
done
echo ""

# Step 5: Check routes
echo "✓ Step 5: Route Files"
ROUTES=(
  "src/routes/daily-quiz.tsx"
  "src/routes/daily-quiz.\$subjectId.tsx"
  "src/routes/daily-quiz-result.tsx"
  "src/routes/daily-quiz-settings.tsx"
)
for route in "${ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo "  ✅ $(basename $route)"
  else
    echo "  ❌ $(basename $route)"
  fi
done
echo ""

echo "✓ Step 6: Scheduler Options"
echo ""
echo "  For VERCEL (Recommended):"
echo "    1. Add env vars to Vercel dashboard:"
echo "       - SUPABASE_SERVICE_ROLE_KEY"
echo "       - LOVABLE_API_KEY"
echo "       - CRON_SECRET"
echo "    2. Deploy: git push"
echo "    3. Verify: Check Vercel dashboard → Crons"
echo ""
echo "  For SUPABASE (pg_cron):"
echo "    1. Enable pg_cron & http extensions"
echo "    2. Run: supabase migration up"
echo ""
echo "  For OTHER PLATFORMS:"
echo "    Use GitHub Actions, AWS EventBridge, Google Cloud Scheduler, etc."
echo ""

echo "📋 Setup Checklist:"
echo "  [ ] Run database migrations: supabase migration up"
echo "  [ ] Set LOVABLE_API_KEY environment variable"
echo "  [ ] (For Vercel) Add CRON_SECRET to environment"
echo "  [ ] Choose scheduler (Vercel cron / pg_cron / GitHub Actions)"
echo "  [ ] Deploy to your platform"
echo "  [ ] Configure user preferences in /daily-quiz-settings"
echo "  [ ] Wait for 12 PM IST and check /daily-quiz"
echo ""

echo "✅ Setup Complete!"
echo ""
echo "📖 Documentation:"
echo "   - For Vercel: See VERCEL_SETUP_GUIDE.md"
echo "   - General: See DAILY_QUIZ_SETUP.md"
echo "   - For devs: See DEVELOPER_REFERENCE.md"
