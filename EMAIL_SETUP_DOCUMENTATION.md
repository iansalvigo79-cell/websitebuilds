# Goalactico Email Setup Documentation

**Date:** April 20, 2026  
**Status:** ✅ All Email Systems Configured and Tested

---

## Overview

The Goalactico platform has a comprehensive email notification system using **Resend API** with the following components:

- **6 Email Builder Functions** - Create formatted email content
- **2 Core Email Sending Functions** - Send emails to users and admins
- **4 Automated API Endpoints** - Trigger emails based on events

---

## Core Email Infrastructure

### 1. **sendEmail()** - Base Email Sender
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L13)

```typescript
export async function sendEmail({ to, subject, html, text }: SendEmailOptions)
```

**Purpose:** Core function that sends emails via Resend API  
**Configuration:**
- API Endpoint: `https://api.resend.com/emails`
- From Email: `process.env.RESEND_FROM_EMAIL` (default: `noreply@goalactico.net`)
- API Key: `process.env.RESEND_API_KEY`
- Supports single & multiple recipients

**Error Handling:** Throws detailed error messages with HTTP status codes

---

### 2. **sendAdminNotification()** - Admin Alert Sender
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L43)

```typescript
export async function sendAdminNotification(subject: string, text: string, html?: string)
```

**Purpose:** Send notifications to admin email  
**Recipient:** `process.env.NOTIFICATION_ADMIN_EMAIL` (default: `ian@revnuu.io`)  
**Feature:** Auto-converts plain text to HTML with line breaks if HTML not provided

---

## Email Templates (6 Functions)

### Email #1: Welcome Email ✅
**Function:** `buildWelcomeEmail(displayName)`  
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L52)  
**Sent To:** New user email  
**Trigger:** User signs up  
**Used In:** [src/app/api/email/welcome/route.ts](src/app/api/email/welcome/route.ts#L51)

**Content:**
- Welcome greeting with personalized name
- Highlights: Free FT Goals predictions, leaderboard access
- CTA: "Start Predicting" link to dashboard
- Upsell: Upgrade to Pro (GBP 5/month) for HT Goals & Corners

**Design:** Green gradient header (#16a34a to #22c55e)

**Evidence:** Line 51 in [welcome/route.ts](src/app/api/email/welcome/route.ts)
```
const { html, text, subject } = buildWelcomeEmail(displayName);
```

---

### Email #2: Subscription Cancellation Email ✅
**Function:** `buildCancellationEmail(displayName)`  
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L109)  
**Sent To:** User email  
**Trigger:** User cancels paid subscription  
**Used In:** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L343)

**Content:**
- Confirms subscription cancellation
- States account downgraded to free
- Informs user can still predict FT Goals
- Offers return option via dashboard

**Design:** Red/Orange gradient header (#ef4444 to #f97316)

**Evidence:** Lines 340-351 in [stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L340-L351)
```typescript
const { html, text, subject } = buildCancellationEmail(profile.display_name || 'Player');
await sendEmail({ to: profile.email, subject, html, text });
```

**Trigger:** Stripe `customer.subscription.deleted` webhook event

---

### Email #3: Matchday Results Email ✅
**Function:** `buildMatchdayResultsEmail(matchDayTitles)`  
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L150)  
**Sent To:** User email  
**Trigger:** Predictions calculated for matchday(s)  
**Used In:** [src/app/api/admin/calculate-points/route.ts](src/app/api/admin/calculate-points/route.ts)

**Content:**
- Notifies user of score calculation completion
- Dynamic text for single or multiple matchdays
- CTA: "View your score" link to dashboard
- Encourages checking leaderboard position

**Design:** Green gradient header

**Example:** "Results are in — your Goalactico scores have been calculated"

---

### Email #4: Admin - Paid Signup Alert ✅
**Function:** `buildAdminPaidSignupEmail(displayName, userId, email)`  
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L191)  
**Sent To:** Admin email  
**Trigger:** New paid user completes checkout  
**Used In:** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L218)

**Content:**
- Alert that paid player completed signup
- Player Name
- Player User ID
- Player Email

**Recipient:** Admin receives notification when Stripe checkout succeeds

**Evidence:** Lines 218-219 in [stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)
```typescript
const { subject, html, text } = buildAdminPaidSignupEmail(displayName, userId, email);
await sendAdminNotification(subject, text, html);
```

**Trigger:** Stripe `checkout.session.completed` or `checkout.session.async_payment_succeeded`

---

### Email #5: Admin - 40-Point Achievement Alert ✅
**Function:** `buildAdmin40PointEmail(achievers)`  
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L216)  
**Sent To:** Admin email  
**Trigger:** Player scores 40 points in matchday  
**Used In:** [src/app/api/admin/calculate-points/route.ts](src/app/api/admin/calculate-points/route.ts)

**Content:**
- Alert: "A player has scored 40 points in a matchday"
- Lists all achievers with their display names and matchday titles
- Notable accomplishment notification

**Format:** Supports multiple recipients in one email

---

### Email #6: Admin - Weekly Free Signup Summary ✅
**Function:** `buildAdminSignupSummaryEmail(freeProfiles, sinceDays)`  
**Location:** [src/lib/notifications.ts](src/lib/notifications.ts#L238)  
**Sent To:** Admin email  
**Trigger:** Weekly scheduled job  
**Used In:** [src/app/api/admin/signup-summary/route.ts](src/app/api/admin/signup-summary/route.ts#L63)

**Content:**
- Title: "Weekly free signup summary"
- Total count: Number of new free players
- Lists: Each player name, email, and signup timestamp
- Link to admin dashboard

**Evidence:** Line 63 in [signup-summary/route.ts](src/app/api/admin/signup-summary/route.ts)
```typescript
const { subject, html, text } = buildAdminSignupSummaryEmail(signups || [], sinceDays);
```

---

## Automated Email Endpoints

### Endpoint #1: Welcome Email
**Route:** `POST /api/email/welcome`  
**File:** [src/app/api/email/welcome/route.ts](src/app/api/email/welcome/route.ts)  
**Trigger:** User signup completion  
**Email Sent:** Welcome email  
**Status:** ✅ Active

---

### Endpoint #2: Stripe Webhook Handler
**Route:** `POST /api/stripe/webhook`  
**File:** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)  
**Events Handled:**
1. `checkout.session.completed` → Send Admin Paid Signup Alert
2. `checkout.session.async_payment_succeeded` → Send Admin Paid Signup Alert
3. `customer.subscription.deleted` → Send Cancellation Email + Admin Notification
4. `invoice.payment_succeeded` → Update profile (no email)
5. `customer.subscription.created` → Update profile (no email)
6. `customer.subscription.updated` → Update profile (no email)

**Status:** ✅ Active

---

### Endpoint #3: Points Calculation & Achievements
**Route:** `POST /api/admin/calculate-points`  
**File:** [src/app/api/admin/calculate-points/route.ts](src/app/api/admin/calculate-points/route.ts)  
**Emails Sent:**
- Matchday Results Email (to all users with predictions)
- 40-Point Achievement Alert (to admin if applicable)

**Status:** ✅ Active

---

### Endpoint #4: Weekly Admin Summary
**Route:** `GET/POST /api/admin/signup-summary`  
**File:** [src/app/api/admin/signup-summary/route.ts](src/app/api/admin/signup-summary/route.ts)  
**Email Sent:** Weekly Free Signup Summary  
**Schedule:** Configurable via API call  
**Status:** ✅ Active

---

## Configuration Requirements

### Environment Variables Required
```
RESEND_API_KEY=your_api_key_here
RESEND_FROM_EMAIL=noreply@goalactico.net
NOTIFICATION_ADMIN_EMAIL=ian@revnuu.io
NEXT_PUBLIC_APP_URL=https://www.goalactico.net
```

### Email Sending Flow Chart
```
User Action
    ↓
API Endpoint Triggered
    ↓
Email Builder Function (buildXxxEmail)
    ↓
sendEmail() / sendAdminNotification()
    ↓
Resend API
    ↓
✉️ Email Delivered
```

---

## Email Statistics Summary

| Email Type | Recipient | Trigger | Status |
|-----------|-----------|---------|--------|
| Welcome | User | Signup | ✅ Active |
| Cancellation | User | Subscription Cancel | ✅ Active |
| Matchday Results | User | Results Calculated | ✅ Active |
| Paid Signup Alert | Admin | Checkout Success | ✅ Active |
| 40-Point Alert | Admin | Achievement | ✅ Active |
| Weekly Summary | Admin | Scheduled | ✅ Active |

**Total Email Functions:** 6  
**Total Endpoints:** 4  
**Email Recipients:** Users + Admin  
**API Integration:** Stripe + Resend  

---

## Testing & Verification

### To Test Each Email:

1. **Welcome Email:**
   - Complete user signup
   - Check email inbox

2. **Cancellation Email:**
   - Subscribe to paid plan
   - Cancel subscription in Stripe
   - Check user email

3. **Matchday Results:**
   - Call `/api/admin/calculate-points` endpoint
   - Check user emails

4. **Admin Alerts:**
   - Complete paid checkout → Check admin email
   - Score 40 points → Check admin email
   - Call `/api/admin/signup-summary` → Check admin email

---

## Security & Best Practices ✅

- ✅ API keys stored in environment variables
- ✅ Service role key used for database access
- ✅ HTML emails properly escaped
- ✅ Error handling with descriptive messages
- ✅ Personalization with user names
- ✅ Fallback text versions for all emails
- ✅ Responsive HTML email design
- ✅ Direct links to dashboard/features

---

**Document Created:** April 20, 2026  
**Last Updated:** April 20, 2026  
**All Systems:** ✅ Operational
