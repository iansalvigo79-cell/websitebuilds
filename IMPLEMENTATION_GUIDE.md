# Football Prediction Game - Implementation Guide

This is a Supabase-powered SaaS football prediction game built with Next.js and Material-UI.

## Project Status

### ✅ Completed
- Frontend scaffold with Next.js and Material-UI
- Authentication pages (Sign In / Sign Up) with form validation  
- Team name field added to player profile
- Dashboard for making predictions
- Leaderboard to view season standings by team name
- Paywall page for subscription
- Basic admin panel UI
- TypeScript database types
- Supabase client integration

### 🚀 Still Needs Implementation

#### 1. **Supabase Setup**
- Create a Supabase project at https://supabase.com
- Enable Auth (Email + Password)
- Create database tables (schema provided in project spec)
- Set up Row Level Security (RLS) policies
- Copy your URL and Anon Key to `.env.local`

#### 2. **Stripe Integration**
- Create a Stripe account (https://stripe.com)
- Create a £5/month subscription product
- Get your Publishable and Secret keys
- Set up webhook endpoint for payment notifications
- Implement webhook to update `profiles.subscription_status`

#### 3. **API Routes & Edge Functions**
Need to create:
- `/api/create-checkout-session` - Create Stripe checkout
- `/api/stripe-webhook` - Handle payment confirmation
- `/api/calculate-scores` - Admin endpoint to score predictions
- `/api/send-admin-email` - Notify admin of max scorers

#### 4. **Authentication Flow**
- Token storage in session
- Session persistence
- Route protection middleware
- Logout functionality

#### 5. **Admin Page Enhancements**
Full implementation needed for:
- Create/edit seasons
- Create/edit match days with cutoff times
- Add games to match days
- Enter final scores for games
- Trigger scoring calculations
- View and manage predictions

#### 6. **Subscription Gates**
- Check `profiles.subscription_status` on dashboard
- Redirect to paywall if inactive
- Handle successful payment redirect

#### 7. **Email Notifications**
- Admin email notification when players score 10 points
- Include match day summary

## Quick Start

### 1. Clone and Install
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Stripe credentials
```

### 3. Database Setup
Run this SQL in your Supabase dashboard under SQL Editor:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name TEXT,
  team_name TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create seasons table
CREATE TABLE seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create match_days table
CREATE TABLE match_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID REFERENCES seasons(id),
  match_date DATE,
  cutoff_at TIMESTAMP,
  is_open BOOLEAN DEFAULT TRUE,
  actual_total_goals INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_day_id UUID REFERENCES match_days(id),
  home_team TEXT,
  away_team TEXT,
  kickoff_at TIMESTAMP,
  home_goals INTEGER,
  away_goals INTEGER,
  is_selected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  match_day_id UUID REFERENCES match_days(id),
  predicted_total_goals INTEGER,
  points INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, match_day_id)
);

-- Create unique index for one prediction per user per match day
CREATE UNIQUE INDEX predictions_user_matchday ON predictions(user_id, match_day_id);
```

### 4. Enable RLS (Row Level Security)
```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can read all predictions (for leaderboard)
CREATE POLICY "Users can read all predictions"
  ON predictions FOR SELECT
  USING (true);

-- Rest of RLS policies...
```

### 5. Run Development Server
```bash
npm run dev
```

## File Structure

```
src/
├── app/
│   ├── page.tsx           # Home page
│   ├── signin/            # Sign in page
│   ├── signup/            # Sign up page (with team name)
│   ├── dashboard/         # Prediction form
│   ├── leaderboard/       # Season standings
│   ├── paywall/           # Subscription page
│   ├── admin/             # Admin panel
│   └── layout.tsx         # Root layout with theme
├── components/
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── Features.tsx
│   ├── Footer.tsx
│   └── index.ts
├── lib/
│   └── supabase.ts        # Supabase client
├── types/
│   └── database.ts        # TypeScript types
└── public/
    └── assets/images/     # Logo and background
```

## Pages Currently Available

- `/` - Home / Landing page
- `/signin` - Login
- `/signup` - Registration with team name
- `/dashboard` - Prediction form (requires subscription)
- `/leaderboard` - Season standings by team name
- `/paywall` - Subscription page
- `/admin` - Admin panel (WIP)

## Key Features Implemented

1. **Team Names** - Players enter team name on signup, shown on leaderboard
2. **Form Validation** - Real-time validation with error messages
3. **Dark Theme** - Fully dark UI matching Goalactico style
4. **Responsive Design** - Mobile-friendly across all pages
5. **Database Types** - TypeScript types for all tables

## Next Steps

1. **Set up Supabase project** with the provided SQL schema
2. **Configure Stripe** and create webhook for payments
3. **Implement payment flow** with Stripe Checkout
4. **Complete admin panel** for managing seasons/games
5. **Add scoring logic** - Calculate points automatically
6. **Email notifications** - Send admin emails for max scorers
7. **Deploy to production** - Vercel recommended for Next.js

## Testing Checklist

- [ ] Supabase auth working (signup/login)
- [ ] Team names stored and visible on leaderboard
- [ ] Dashboard shows current match day
- [ ] Predictions save to database
- [ ] Stripe checkout integration
- [ ] Subscription status gates dashboard
- [ ] Admin can create seasons
- [ ] Admin can create match days
- [ ] Leaderboard displays correctly
- [ ] Scoring calculates points

## Support

For issues with:
- **Supabase**: Check docs at supabase.com/docs
- **Stripe**: See stripe.com/docs
- **Next.js**: Reference nextjs.org/docs

