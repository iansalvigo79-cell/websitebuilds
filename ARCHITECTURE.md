# Technical Architecture & Implementation Roadmap

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER BROWSER                                │
│  (Next.js Frontend - src/app/*)                                  │
├─────────────────────────────────────────────────────────────────┤
│ · Home page      · Sign in/up   · Dashboard  · Leaderboard      │
│ · Admin panel    · Paywall      · Layout     · Navigation        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP REST API
            ┌────────────────┴────────────────┐
            │                                 │
      ┌─────▼──────────────┐    ┌──────────────▼──────────┐
      │  Supabase          │    │   Stripe API            │
      │  (PostgreSQL)      │    │   (Payment Processing)  │
      ├────────────────────┤    ├──────────────────────────┤
      │ Auth               │    │ Checkout Sessions       │
      │ Tables             │    │ Webhooks                │
      │ Edge Functions     │    │ Subscription Status     │
      │ RLS Policies       │    │ Customer Data           │
      └────────────────────┘    └──────────────────────────┘

      ┌────────────────────────────────┐
      │   SendGrid (Email)             │
      │   - Perfect Score Emails       │
      │   - Notifications              │
      └────────────────────────────────┘
```

---

## Current Implementation Status

### ✅ COMPLETED - Frontend Layer

#### Pages (8 files, all created)
```typescript
// src/app/

page.tsx                    // Home page - Landing page hero section
layout.tsx                  // Root layout - Material-UI theme provider
signin/page.tsx            // Sign In form
signup/page.tsx            // Sign Up form with team_name field
dashboard/page.tsx         // Prediction submission interface
leaderboard/page.tsx       // Season standings (team names only)
paywall/page.tsx           // Subscription purchase page
admin/page.tsx             // Admin control panel
```

#### Components (4 reusable components)
```typescript
// src/components/

Header.tsx                  // Navigation + logo
Hero.tsx                    // Landing page hero
Features.tsx                // Features showcase
Footer.tsx                  // Footer
```

#### Libraries
```typescript
// src/lib/

supabase.ts                 // Supabase client initialization
                            // Exports: supabase instance
```

#### Types
```typescript
// src/types/

database.ts                 // TypeScript interfaces for all DB tables
                            // Exports: Profile, Season, MatchDay, Game, Prediction, LeaderboardEntry
game.ts                     // Game type definitions
```

### 🟡 IN PROGRESS - Backend Layer

#### Missing: Supabase Setup
```
❌ Supabase Project Creation
❌ Database Table Creation  
❌ Trigger for Auto-Profile Creation
❌ RLS Policies Configuration
❌ Auth Trigger Setup
```

**What Needs to Be Done:**
1. Create Supabase account
2. Create project
3. Run SQL schema (provided in DEVELOPMENT_GUIDE.md)
4. Enable auth
5. Create RLS policies
6. Copy credentials to .env.local

#### Missing: API Endpoints (Supabase Edge Functions)

**Location:** `supabase/functions/` (needs creation)

```typescript
// These need to be created as Edge Functions in Supabase

supabase/functions/
├── create-checkout-session/
│   └── index.ts          // POST /api/create-checkout-session
│                          // Purpose: Create Stripe checkout
│                          // Receives: userId
│                          // Returns: Stripe session URL
│
├── stripe-webhook/
│   └── index.ts          // POST /api/webhooks/stripe
│                          // Purpose: Handle Stripe events
│                          // Events: checkout.session.completed, customer.subscription.*
│                          // Action: Update profiles.subscription_status
│
├── calculate-scores/
│   └── index.ts          // POST /api/calculate-scores
│                          // Purpose: Score predictions for match day
│                          // Receives: matchDayId, actualTotalGoals
│                          // Logic: Compare predictions, assign points
│
└── send-admin-email/
    └── index.ts          // POST /api/send-admin-email
                           // Purpose: Notify admin of perfect scores
                           // Receives: userId, teamName, matchDay
                           // Action: Send email via SendGrid
```

#### Missing: Admin Backend Functions

```typescript
// These need to be added to src/app/admin/page.tsx

✓ createSeason()           // Already implemented in UI
❌ createMatchDay()         // UI only, needs Supabase insert
❌ addGame()                // UI only, needs Supabase insert
❌ enterScore()             // UI only, needs scoring logic
❌ deleteMatchDay()         // Not even in UI yet
❌ deleteGame()             // Not even in UI yet
```

---

## File Creation Plan (What to Build)

### Priority 1: Database Setup (External, no code needed)
```
ACTION: Set up Supabase project
- Go to supabase.com
- Sign up
- Create new project
- Run SQL schema from DEVELOPMENT_GUIDE.md
- Copy URL + Key to .env.local
```

### Priority 2: Environment Configuration
```
FILE: .env.local (copy from .env.local.example and fill in)
VARS NEEDED:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_PRICE_ID
- SENDGRID_API_KEY
- ADMIN_EMAIL
```

### Priority 3: Create Stripe Edge Function
```
FILE: supabase/functions/create-checkout-session/index.ts

Purpose: Create Stripe checkout session
Endpoint: POST /api/create-checkout-session

Code Template:
```typescript
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

export default async (req: Request) => {
  if (req.method === 'POST') {
    const { userId } = await req.json();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: Deno.env.get('STRIPE_PRICE_ID'),
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL')}/dashboard?success=true`,
      cancel_url: `${Deno.env.get('SITE_URL')}/paywall?canceled=true`,
      client_reference_id: userId,
    });

    return new Response(
      JSON.stringify({ sessionUrl: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```
```

### Priority 4: Create Stripe Webhook Handler
```
FILE: supabase/functions/stripe-webhook/index.ts

Purpose: Handle Stripe subscription events
Endpoint: POST /api/webhooks/stripe

Code Template:
```typescript
import Stripe from 'https://esm.sh/stripe@13.0.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

export default async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get('stripe-signature') || '';
  const body = await req.text();

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await supabase
          .from('profiles')
          .update({ 
            subscription_status: 'active',
            stripe_customer_id: session.customer
          })
          .eq('id', session.client_reference_id);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status === 'active' ? 'active' : 'inactive';
        // Update profile by stripe_customer_id
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Mark subscription as cancelled
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Webhook error' }), { status: 400 });
  }
}
```
```

### Priority 5: Complete Admin Panel
```
FILE: src/app/admin/page.tsx (modify existing)

Add Functions:
- createMatchDay()
- addGame()
- enterScore() 
- calculateScores()
- updateUI after each action

Add UI Components:
- Match Days tab: Form to create match days
- Games tab: Form to add games to match days
- Scores tab: Form to enter final scores
```

### Priority 6: Email Notifications
```
FILE: src/lib/email.ts (new)

Function: sendPerfectScoreEmail()
Purpose: Notify admin when player scores 10 points

Code:
```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendPerfectScoreEmail(teamName: string, matchDayId: string) {
  const msg = {
    to: process.env.ADMIN_EMAIL || '',
    from: 'noreply@gamepredict.com',
    subject: `🎯 Perfect Score! ${teamName}`,
    html: `
      <h2>🎯 Perfect Score Alert!</h2>
      <p><strong>${teamName}</strong> predicted the exact total goals!</p>
      <p>They earned <strong>10 points</strong> for Match Day ${matchDayId}</p>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error('Email error:', error);
  }
}
```
```

---

## Current Code Quality Status

### TypeScript
✅ All files compile without errors
✅ Strict mode enabled
✅ Types defined for database layer
✅ React components typed

### Performance
✅ Code splitting configured
✅ Image optimization ready
✅ Dark mode CSS optimized
✅ Form validation on client

### Best Practices
✅ Modern React (functional components)
✅ Material-UI patterns followed
✅ Environment variables for secrets
✅ Error handling in forms
✅ Loading states implemented

### Missing
❌ API error handling
❌ Network retry logic
❌ Optimistic UI updates
❌ Unit tests
❌ Performance monitoring

---

## Data Flow Diagrams

### Authentication Flow
```
User Signs Up
    ↓
signup/page.tsx form
    ↓
POST supabase.auth.signUp(email, password)
    ↓
Supabase creates auth.users record
    ↓
Trigger: handle_new_user() runs
    ↓
INSERT profiles table with team_name
    ↓
User can now sign in
    ↓
Redirected to /signin
```

### Prediction Flow
```
User views /dashboard
    ↓
Check auth.getUser() → if not, redirect /signin
    ↓
Check profiles.subscription_status → if inactive, redirect /paywall
    ↓
Fetch current match_day (is_open = true)
    ↓
Fetch games for that match_day
    ↓
User submits prediction for total goals
    ↓
Check if prediction already exists
    ↓
  If exists → UPDATE predictions SET predicted_total_goals = X
  If not → INSERT new prediction
    ↓
Show success message
    ↓
Next page refresh updates leaderboard
```

### Scoring Flow
```
Admin clicks "Enter Score" button
    ↓
Admin enters: home_goals, away_goals
    ↓
POST /api/admin/enter-score
    ↓
UPDATE games SET home_goals = X, away_goals = Y
    ↓
Calculate actual_total_goals from selected games
    ↓
UPDATE match_days SET actual_total_goals = Z, is_open = false
    ↓
POST /api/calculate-scores
    ↓
FOR each prediction in this match_day:
  IF predicted_total_goals == actual_total_goals THEN
    UPDATE predictions SET points = 10
    SEND email notification
  ELSE
    UPDATE predictions SET points = 0
  END IF
    ↓
Leaderboard updates automatically
    ↓
Season standings change
```

### Payment Flow
```
Unsubscribed user tries to access /dashboard
    ↓
Check subscription_status != 'active'
    ↓
Redirect to /paywall
    ↓
User clicks "Subscribe Now"
    ↓
POST /api/create-checkout-session { userId }
    ↓
Edge Function creates Stripe charge session
    ↓
Redirect to Stripe Checkout page
    ↓
User enters payment info
    ↓
Stripe processes payment
    ↓
Stripe sends webhook: checkout.session.completed
    ↓
Webhook Handler receives event
    ↓
UPDATE profiles SET subscription_status = 'active'
    ↓
User can now access /dashboard
```

---

## Deployment Architecture

### Development
```
Local Machine
  ├── npm run dev          → Runs on http://localhost:3000
  ├── .env.local           → Local secrets
  └── next cache

Supabase Project (Dev)
  ├── Database test data
  ├── Auth testing
  └── Edge Functions
```

### Production
```
Vercel (vercel.com)
  ├── Next.js Frontend
  ├── Environment variables (secrets)
  ├── Auto deployments from GitHub
  └── CDN for static assets

Supabase (Cloud)
  ├── Production database
  ├── Auth provider
  ├── Edge Functions
  └── Daily backups

Stripe (stripe.com)
  ├── Payment processing
  ├── Webhooks → https://yourdomain.com/api/webhooks/stripe
  └── Customer data
```

---

## Key Integration Points

### Frontend ↔ Supabase
```typescript
// Pattern used everywhere:
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('column', value);

if (error) console.error(error);
```

### Frontend ↔ Stripe
```typescript
// In paywall page:
const response = await fetch('/api/create-checkout-session', {
  method: 'POST',
  body: JSON.stringify({ userId: currentUser.id })
});
const { sessionUrl } = await response.json();
window.location.href = sessionUrl;
```

### Backend ↔ Stripe Webhooks
```typescript
// Edge Function receives Stripe events
// Updates database based on event type
// No frontend response needed
```

---

## Security Considerations

### Current Security
✅ Passwords hashed by Supabase
✅ Environment variables for secrets
✅ TypeScript for type safety
✅ Form validation

### Still Needed
❌ CSRF protection
❌ Rate limiting
❌ Input sanitization
❌ CORS configuration
❌ API key rotation
❌ Encryption for sensitive data

### RLS Policies
```sql
-- Users can only see their own subscription status
-- Predictions visible to all (for leaderboard)
-- Games/Match Days visible to all
-- Admin operations restricted to admin role (TBD)
```

---

## Performance Optimization Opportunities

### Frontend
- Lazy load leaderboard table (virtualization)
- Cache user profile data
- Minimize re-renders in forms
- Code split admin components

### Backend
- Pre-calculate leaderboard view
- Index on (user_id, match_day_id) for predictions
- Cache active season/match day
- Use pooled connections

### Data Transfer
- Paginate leaderboard results
- Only fetch needed columns
- Compress images
- CDN for static assets

---

## Testing Strategy

### Unit Tests (Recommended)
```typescript
// Test validation functions
test('Form validation', () => { ... })

// Test scoring logic
test('Scoring', () => {
  expect(calculatePoints(24, 24)).toBe(10);
  expect(calculatePoints(24, 25)).toBe(0);
})

// Test date calculations
test('Cutoff time', () => { ... })
```

### Integration Tests
```typescript
// Test full flows
test('Sign up → Create profile → Sign in', () => { ... })
test('Submit prediction → Score → Calculate points', () => { ... })
test('Subscribe → Access dashboard', () => { ... })
```

### Manual Testing
- Test on mobile (responsive)
- Test network errors (disconnect)
- Test race conditions (double submit)
- Test edge cases (exact time of cutoff)

---

## Maintenance & Updates

### Regular Tasks
- Monitor error logs
- Check database performance
- Review Stripe webhook failures
- Update dependencies monthly

### Scaling
- Add indexing as data grows
- Consider separate read replicas
- Add caching layer
- Monitor Vercel usage

### Feature Additions
- Export leaderboard to CSV
- Multi-season tracking
- League invitations
- Mobile app version
- API for third-party integrations

---

## Summary: You Are Here

```
████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 40% Complete

Phase 1: Foundation          ████████████████████████ ✅ DONE
Phase 2: Frontend Layout     ████████████████████████ ✅ DONE
Phase 3: Components          ████████████████████████ ✅ DONE
Phase 4: Database Setup      ░░░░░░░░░░░░░░░░░░░░░░░░ 0% (Need account)
Phase 5: Auth Integration    ████░░░░░░░░░░░░░░░░░░░░ 20% (Need DB)
Phase 6: Predictions         ████░░░░░░░░░░░░░░░░░░░░ 20% (Need DB)
Phase 7: Stripe Payment      ░░░░░░░░░░░░░░░░░░░░░░░░ 0% (Need account)
Phase 8: Admin Panel         ██░░░░░░░░░░░░░░░░░░░░░░ 10% (Partial)
Phase 9: Scoring             ░░░░░░░░░░░░░░░░░░░░░░░░ 0%
Phase 10: Notifications      ░░░░░░░░░░░░░░░░░░░░░░░░ 0%

Next Actions:
1. Create Supabase account (50 min)
2. Set up database (30 min)
3. Test auth flow (1 hour)
4. Build Stripe integration (2 hours)
```

