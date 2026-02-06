# Development Progress & Next Steps

## Current Status Summary

✅ **Completed**
- [x] Frontend structure with Next.js + TypeScript + Material-UI
- [x] Dark theme matching Goalactico style
- [x] All pages scaffolded (Home, Sign In/Up, Dashboard, Leaderboard, Paywall, Admin)
- [x] Authentication forms with team name field
- [x] TypeScript database types
- [x] Supabase client configuration
- [x] Layout components (Header, Hero, Features, Footer)

❌ **Critical Missing Pieces**
- [ ] Database tables creation
- [ ] Stripe payment integration
- [ ] Subscription status checks
- [ ] Match day and game management
- [ ] Prediction scoring system
- [ ] Admin backend logic

---

## Step-by-Step Implementation Plan

### Phase 1: Database Setup (CRITICAL - DO THIS FIRST)

**What:** Create all tables in Supabase

**How:**
1. Go to https://supabase.com and sign up/log in
2. Create a new project
3. Go to SQL Editor and run the schema setup script (see below)
4. Copy your project URL and Anon Key to `.env.local`

**SQL to run in Supabase:**

```sql
-- 1. Create profiles table (tied to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  team_name VARCHAR(255) NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255),
  subscription_status VARCHAR(50) DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create seasons table
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create match_days table
CREATE TABLE match_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  match_date DATE NOT NULL,
  cutoff_at TIMESTAMP NOT NULL,
  is_open BOOLEAN DEFAULT TRUE,
  actual_total_goals INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_day_id UUID NOT NULL REFERENCES match_days(id) ON DELETE CASCADE,
  home_team VARCHAR(255) NOT NULL,
  away_team VARCHAR(255) NOT NULL,
  kickoff_at TIMESTAMP,
  home_goals INTEGER,
  away_goals INTEGER,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Create predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_day_id UUID NOT NULL REFERENCES match_days(id) ON DELETE CASCADE,
  predicted_total_goals INTEGER NOT NULL,
  points INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, match_day_id)
);

-- 6. Create leaderboard view
CREATE VIEW leaderboard_standings AS
SELECT 
  p.user_id,
  pr.team_name,
  COUNT(p.id) as predictions_count,
  COALESCE(SUM(p.points), 0) as total_points
FROM predictions p
LEFT JOIN profiles pr ON p.user_id = pr.id
WHERE p.points IS NOT NULL
GROUP BY p.user_id, pr.team_name
ORDER BY total_points DESC;

-- 7. Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Anyone can read all profiles (needed for leaderboard)
CREATE POLICY "Anyone can read profiles" ON profiles
  FOR SELECT USING (true);

-- Anyone can read public match days
CREATE POLICY "Anyone can read match_days" ON match_days
  FOR SELECT USING (true);

-- Anyone can read public games
CREATE POLICY "Anyone can read games" ON games
  FOR SELECT USING (true);

-- Users can read their own predictions
CREATE POLICY "Users can read own predictions" ON predictions
  FOR SELECT USING (auth.uid() = user_id);

-- Anyone can read all predictions (for leaderboard)
CREATE POLICY "Anyone can read all predictions" ON predictions
  FOR SELECT USING (true);

-- Users can insert predictions for themselves
CREATE POLICY "Users can insert own predictions" ON predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own predictions
CREATE POLICY "Users can update own predictions" ON predictions
  FOR UPDATE USING (auth.uid() = user_id);

-- 9. Create auth trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, team_name)
  VALUES (new.id, new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'team_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

**Verify:** Go to Supabase dashboard and see all 5 tables created with data

---

### Phase 2: Environment Variables

**What:** Set up local environment file

**How:**
1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:
   - Get them from Supabase dashboard → Settings → API
   - Look for "Project URL" and "anon" key
3. For Stripe, leave placeholder for now (we'll add later)

**File:** `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
SENDGRID_API_KEY=SG....
ADMIN_EMAIL=admin@yoursite.com
```

---

### Phase 3: Test Authentication Flow

**What:** Make sure sign up and sign in work

**How:**
1. Run: `npm run dev`
2. Navigate to http://localhost:3000/signup
3. Fill form and click "Create Account"
4. Check Supabase dashboard → Authentication → Users
5. Should see new user record with team_name in metadata
6. Navigate to `/signin` and log in

**Success Criteria:**
- User account created in Supabase Auth
- Profile created with team_name
- Can log in successfully
- Dashboard shows "Subscribe to continue" message

---

### Phase 4: Stripe Setup (Payment System)

**What:** Add subscription payment functionality

**Steps:**
1. Create Stripe account at stripe.com
2. Create product: "Football Prediction Game"
3. Create price: £5/month (recurring)
4. Note the Price ID (price_xxx)
5. Add to `.env.local`

**Next:** Create Stripe webhook handler and checkout page (see Phase 5)

---

### Phase 5: Complete Admin Panel

**What:** Finish the admin backend

**Required Functions:**

#### 5a. Create Match Days
```typescript
// Add to src/app/admin/page.tsx under "Match Days" tab
async function createMatchDay() {
  const { data, error } = await supabase
    .from('match_days')
    .insert({
      season_id: selectedSeasonId,
      match_date: formData.matchDate,
      cutoff_at: formData.cutoffTime,
      is_open: true
    });
}
```

#### 5b. Add Games
```typescript
// Add games to a match day
async function addGame() {
  const { data, error } = await supabase
    .from('games')
    .insert({
      match_day_id: matchDayId,
      home_team: formData.homeTeam,
      away_team: formData.awayTeam,
      kickoff_at: formData.kickoffTime,
      is_selected: true
    });
}
```

#### 5c. Enter Scores & Calculate Points
```typescript
// Enter final score
async function enterScore(gameId, homeGoals, awayGoals) {
  // 1. Update game with final score
  await supabase
    .from('games')
    .update({ home_goals: homeGoals, away_goals: awayGoals })
    .eq('id', gameId);

  // 2. Update match day with actual total
  const totalGoals = homeGoals + awayGoals;
  await supabase
    .from('match_days')
    .update({ actual_total_goals: totalGoals, is_open: false })
    .eq('id', matchDayId);

  // 3. Calculate points for all predictions
  await calculatePointsForMatchDay(matchDayId, totalGoals);
}

async function calculatePointsForMatchDay(matchDayId, actualGoals) {
  // Get all predictions for this match day
  const { data: predictions } = await supabase
    .from('predictions')
    .select('*')
    .eq('match_day_id', matchDayId);

  // Calculate points: 10 if exact, 0 if wrong
  for (const pred of predictions) {
    const points = pred.predicted_total_goals === actualGoals ? 10 : 0;
    
    // Update prediction with points
    await supabase
      .from('predictions')
      .update({ points })
      .eq('id', pred.id);

    // If perfect score, notify admin
    if (points === 10) {
      await sendAdminEmail(pred.user_id);
    }
  }
}
```

---

### Phase 6: Email Notifications

**What:** Notify admin when players get perfect scores

**Setup SendGrid:**
1. Create account at sendgrid.com
2. Create API key
3. Add to `.env.local`: `SENDGRID_API_KEY`

**Email Function:**
```typescript
// src/lib/email.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendPerfectScoreEmail(userId: string) {
  const { data: user } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  const msg = {
    to: process.env.ADMIN_EMAIL,
    from: 'noreply@gamepredict.com',
    subject: `🎯 Perfect Score! ${user.team_name}`,
    html: `<h2>${user.team_name} scored 10 points!</h2>`,
  };

  await sgMail.send(msg);
}
```

---

## Testing Checklist

Test each feature in order:

- [ ] **Sign Up**
  - [x] Form shows team name field
  - [ ] Creates user in Supabase Auth
  - [ ] Creates profile with team_name in database
  - [ ] Can sign in after signing up

- [ ] **Dashboard**
  - [ ] Redirects to /paywall if not subscribed
  - [ ] Shows current match day
  - [ ] Shows list of games
  - [ ] Can submit prediction
  - [ ] Predictions save to database
  - [ ] Cutoff time prevents submissions

- [ ] **Leaderboard**
  - [ ] Shows team names (not emails)
  - [ ] Ranks players by points
  - [ ] Shows medals for top 3
  - [ ] Updates when predictions are scored

- [ ] **Admin Panel**
  - [ ] Can create season
  - [ ] Can create match day
  - [ ] Can add games
  - [ ] Can enter scores
  - [ ] Scoring calculates points correctly

- [ ] **Payments**
  - [ ] Paywall shows subscription offer
  - [ ] Click Subscribe goes to Stripe
  - [ ] Payment creates Stripe customer
  - [ ] Dashboard unlocked after payment
  - [ ] Canceling subscription blocks dashboard

---

## Common Issues & Solutions

### "Team name not showing on leaderboard"
- Check RLS policies allow reading predictions
- Verify profiles table has team_name field
- Check leaderboard query joins profiles correctly

### "Dashboard says 'Loading...' forever"
- Check browser console for errors
- Verify Supabase credentials in `.env.local`
- Check RLS policies for match_days table

### "Sign up fails silently"
- Open browser DevTools → Network tab
- Look for failed API calls
- Check email format is valid
- Verify auth is enabled in Supabase

### "Predictions don't appear in leaderboard"
- Verify points are calculated (should be 10 or 0)
- Check `predictions` table has `points` column set
- Verify `is_open = false` on match day (closes predictions)

---

## Production Deployment

When ready to deploy:

1. **Provider:** Vercel (easiest for Next.js)
   - `npm run build` to verify locally
   - Push to GitHub
   - Connect to Vercel

2. **Environment:** Set vars in Vercel dashboard
   - Copy from `.env.local`
   - Add production Stripe keys

3. **Database:** Use Supabase cloud
   - Already hosted, no setup needed

4. **Stripe Webhooks:**
   - Set endpoint to: `https://yourdomain.com/api/webhooks/stripe`
   - Enable: `checkout.session.completed`, `customer.subscription.updated`

5. **Custom Domain:**
   - Set in Vercel + Stripe webhook URL

---

## Next Immediate Action

**Run this command:**
```bash
npm run dev
```

**Then visit:** http://localhost:3000

**Test:** Can you see the home page with Goalactico logo?

Once database is set up, sign up with:
- Email: test@example.com
- Password: TestPass123!
- Display Name: Test Player
- Team Name: Test FC

Report any errors you see in the browser console!

