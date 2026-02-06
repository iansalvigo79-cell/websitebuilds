# Project Checklist & Status

## Phase 1: Foundation ✅ COMPLETE

- [x] Next.js 15 project setup
- [x] TypeScript configuration
- [x] Material-UI integration
- [x] Dark theme customization
- [x] Google Fonts (Chakra Petch, Inter)
- [x] Environment variables template
- [x] Git initialized

## Phase 2: UI & Pages ✅ COMPLETE

- [x] Home page with hero section
- [x] Header with logo and navigation
- [x] Features section
- [x] Footer
- [x] Sign In page with form
- [x] Sign Up page with team name field
- [x] Dashboard page structure
- [x] Leaderboard page structure
- [x] Paywall page structure
- [x] Admin panel structure

## Phase 3: Frontend Logic ✅ COMPLETE

- [x] Form validation with Material-UI
- [x] Error handling and display
- [x] Loading states
- [x] Responsive design (xs/sm/md/lg)
- [x] Team name field implementation
- [x] TypeScript types for database

## Phase 4: Backend Integration 🟡 IN PROGRESS

### Supabase Setup
- [ ] Supabase project created
- [ ] Database tables created (SQL schema provided)
- [ ] Profile trigger for auto-profile creation
- [ ] RLS policies configured
- [ ] Authentication enabled

### Supabase Configuration
- [x] Client library installed
- [x] Supabase client created (src/lib/supabase.ts)
- [x] Environment variables template
- [ ] Environment variables filled in
- [ ] Supabase credentials added to .env.local

### Authentication
- [x] Sign Up page ready
- [x] Sign In page ready
- [x] Team name field in Sign Up
- [ ] Test sign up → profile creation
- [ ] Test sign in
- [ ] Test profile data saved

## Phase 5: Dashboard & Predictions ⏳ WAITING FOR DB

- [x] Dashboard page code written
- [ ] Can see current match day
- [ ] Can see list of games
- [ ] Can submit prediction
- [ ] Predictions saved to database
- [ ] Cutoff time enforcement working
- [ ] Form validation working

## Phase 6: Leaderboard ⏳ WAITING FOR DB

- [x] Leaderboard page code written
- [x] Displays team names only (privacy protection)
- [ ] Fetches from database
- [ ] Shows correct rankings
- [ ] Updates in real-time

## Phase 7: Stripe Integration ❌ NOT STARTED

### Stripe Setup
- [ ] Stripe account created
- [ ] Product created (Football Prediction Game)
- [ ] Price created (£5/month)
- [ ] Price ID in environment variables
- [ ] Publishable key in environment variables
- [ ] Secret key in environment variables

### Stripe Frontend
- [x] Paywall page created
- [ ] Subscribe button functional
- [ ] Redirects to Stripe Checkout
- [ ] Handles checkout errors

### Stripe Backend
- [ ] /api/create-checkout-session endpoint
- [ ] /api/webhooks/stripe endpoint
- [ ] Webhook: checkout.session.completed
- [ ] Webhook: customer.subscription.updated
- [ ] Webhook: customer.subscription.deleted
- [ ] Updates profiles.subscription_status

## Phase 8: Admin Panel ⏳ PARTIAL

- [x] Admin page structure
- [x] Tabbed interface
- [x] Create Season dialog
- [ ] Create Match Day form
- [ ] Add Game form
- [ ] Enter Scores form
- [ ] Delete Season endpoint
- [ ] Delete Match Day endpoint
- [ ] Delete Game endpoint
- [ ] Admin role verification

## Phase 9: Scoring System ❌ NOT STARTED

- [ ] Calculate points function
- [ ] Update predictions with points
- [ ] Handle exact match scoring (10 pts)
- [ ] Handle wrong predictions (0 pts)
- [ ] Trigger on score entry
- [ ] Verify against total goals

## Phase 10: Email Notifications ❌ NOT STARTED

- [ ] SendGrid account setup
- [ ] API key in environment variables
- [ ] Email template for perfect scores
- [ ] Send email function
- [ ] Trigger on 10 point prediction
- [ ] Admin notification

## Testing ⏳ PARTIAL

### Unit Tests
- [ ] Form validation logic
- [ ] Scoring calculation
- [ ] Points assignment

### Integration Tests
- [ ] Sign up flow end-to-end
- [ ] Sign in flow end-to-end
- [ ] Prediction submission
- [ ] Score entry and calculation
- [ ] Leaderboard updates
- [ ] Payment flow

### Manual Testing
- [ ] Homepage loads
- [ ] Sign up form works (once DB ready)
- [ ] Sign in form works (once DB ready)
- [ ] Dashboard accessible (once subscribed)
- [ ] Can predict (once match day exists)
- [ ] Leaderboard shows team names
- [ ] Admin can create season
- [ ] Payment redirects to Stripe

## Documentation ✅ COMPLETE

- [x] IMPLEMENTATION_GUIDE.md
- [x] DEVELOPMENT_GUIDE.md
- [x] DATABASE_SCHEMA.md
- [x] This checklist

---

## Priority Order for Next Steps

### 🔴 Critical (Do First)
1. Create Supabase project and database tables
2. Fill in .env.local with Supabase credentials
3. Test sign up → profile creation flow

### 🟠 High Priority (Do Second)
4. Test sign in flow
5. Create match day and game data in admin panel
6. Test dashboard predictions
7. Verify leaderboard displays correctly

### 🟡 Medium Priority (Do Third)
8. Set up Stripe account and payment flow
9. Create Stripe webhook handler
10. Test full subscription flow

### 🟢 Lower Priority (Do Last)
11. Email notifications setup
12. Admin role verification
13. RLS policy testing
14. End-to-end testing

---

## Quick Reference: What's Ready Now

### Can Do (Code Ready)
```
✓ npm install              → Install dependencies
✓ npm run dev             → Start development server
✓ Create Supabase project → Database setup
✓ npm run build           → Test production build
```

### Can't Do Yet (Needs Setup)
```
✗ Sign up users           → Need Supabase database
✗ Make predictions        → Need match days in DB
✗ View leaderboard        → Need predictions in DB
✗ Subscribe               → Need Stripe account
✗ Admin functions         → Need validation
```

---

## Current File Inventory

### Frontend Pages (Ready to Use)
```
src/app/
├── page.tsx              ✓ Home page
├── layout.tsx            ✓ Root layout
├── signin/page.tsx       ✓ Sign in page
├── signup/page.tsx       ✓ Sign up with team name
├── dashboard/page.tsx    ✓ Predictions form
├── leaderboard/page.tsx  ✓ Season standings
├── paywall/page.tsx      ✓ Subscription offer
└── admin/page.tsx        ✓ Admin panel (partial)
```

### Components (Built)
```
src/components/
├── Header.tsx            ✓ Navigation
├── Hero.tsx              ✓ Landing hero
├── Features.tsx          ✓ Feature section
├── Footer.tsx            ✓ Footer
└── index.ts              ✓ Exports
```

### Libraries & Types (Ready)
```
src/lib/
└── supabase.ts           ✓ Client setup

src/types/
├── database.ts           ✓ TypeScript types
└── game.ts               ✓ Game types
```

### Config Files (Done)
```
.env.local.example        ✓ Template
package.json              ✓ Dependencies
tsconfig.json             ✓ TypeScript config
next.config.js            ✓ Next.js config
.eslintrc.json            ✓ Linting rules
```

---

## Estimated Time to Complete

### By Phase
- Phase 1-3: ✅ Done (~6 hours total)
- Phase 4: ⏳ 2-3 hours (database setup + testing)
- Phase 5-6: ⏳ 2-3 hours (fetch data + display)
- Phase 7: ⏳ 3-4 hours (Stripe integration)
- Phase 8-10: ⏳ 4-5 hours (admin, scoring, emails)
- Testing: ⏳ 2-3 hours

**Total: ~13-17 hours for full implementation**

### Quick Start Path (MVP, 3-4 hours)
1. Supabase setup (30 min)
2. Test auth flow (30 min)
3. Test predictions (1 hour)
4. Paywall + Stripe (1.5 hours)
5. Manual testing (30 min)

---

## Common Errors & Fixes

### "Cannot find module '@/lib/supabase'"
- [ ] Verify `src/lib/supabase.ts` exists
- [ ] Check import path: `import { supabase } from '@/lib/supabase'`
- [ ] Run: `npm run build` to clear cache

### "Next_PUBLIC_SUPABASE_URL is undefined"
- [ ] Create `.env.local` file
- [ ] Copy values from `.env.local.example`
- [ ] Restart dev server: `npm run dev`
- [ ] Check env vars with: `console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)`

### "Database tables not found"
- [ ] Verify Supabase database is running
- [ ] Run SQL schema creation script
- [ ] Check table names match exactly
- [ ] Verify RLS is enabled

### "Sign up creates user but not profile"
- [ ] Check auth trigger is created in Supabase
- [ ] Verify metadata is being passed to signUp
- [ ] Check user_metadata column in auth.users

---

## Deployment Checklist

### Before Going Live
- [ ] All environment variables set
- [ ] Supabase RLS policies configured
- [ ] Stripe webhooks configured
- [ ] Email template created
- [ ] Admin users set up
- [ ] Database backups enabled
- [ ] Error logging configured
- [ ] Rate limiting enabled
- [ ] HTTPS certificate installed

### Deployment Steps
1. Push code to GitHub
2. Connect Vercel to GitHub
3. Set environment variables in Vercel
4. Set Stripe webhook URL to production domain
5. Update payment prices to live amounts
6. Test full flow with real payment (then refund)
7. Monitor error logs for 24 hours

---

## Success Metrics

Once complete, you should be able to:

- [ ] User signs up with email + team name
- [ ] User pays £5/month via Stripe
- [ ] User sees upcoming match day
- [ ] User predicts total goals for all selected games
- [ ] Admin enters final scores
- [ ] System calculates points automatically
- [ ] Leaderboard shows top teams (by team name, not real name)
- [ ] Perfect score email sent to admin
- [ ] User can cancel subscription anytime

---

## Support Resources

### Official Documentation
- Next.js: https://nextjs.org/docs
- Material-UI: https://mui.com/material-ui/getting-started/
- Supabase: https://supabase.com/docs
- Stripe: https://stripe.com/docs

### Helpful Links
- Supabase SQL Editor: https://app.supabase.com → SQL
- Stripe Dashboard: https://dashboard.stripe.com
- Vercel Deployments: https://vercel.com/dashboard
- GitHub Repo: Create one and connect to Vercel

---

**Last Updated:** Current Session  
**Status:** ~40% Complete (UI Done, Server in Progress)

