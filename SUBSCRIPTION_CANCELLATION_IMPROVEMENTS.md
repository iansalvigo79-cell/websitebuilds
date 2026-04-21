# Subscription Cancellation Flow - Improvements

**Status:** ✅ Fully Implemented  
**Date:** April 20, 2026  
**Objective:** Robustify subscription cancellation with reliable notifications

---

## Overview

The subscription cancellation flow has been completely improved to handle edge cases, provide better logging, and ensure both player and admin notifications are sent reliably.

---

## Changes Made

### 1. New Admin Cancellation Email Function

**File:** [src/lib/notifications.ts](src/lib/notifications.ts)

Added `buildAdminCancellationEmail()` function:

```typescript
export function buildAdminCancellationEmail(
  displayName: string | null,
  email: string | null,
  userId: string,
  subscriptionId: string
) {
  // Returns {subject, html, text}
}
```

**What it does:**
- Creates a professional HTML email for admin (ian@revnuu.io)
- Includes player name, email, user ID, and subscription ID
- Confirms user has been downgraded to free tier
- Uses red/orange branding consistent with cancellation theme

**Email Content:**
```
To: ian@revnuu.io
Subject: Subscription Cancelled - Goalactico

Body:
- A paid subscription has been cancelled
- Player Name: [name]
- Email: [email]
- User ID: [userId]
- Subscription ID: [subscriptionId]
- ✓ User automatically downgraded to free tier
```

---

### 2. Improved Stripe Webhook Handler

**File:** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)

**Event:** `customer.subscription.deleted`

#### Improvements:

✅ **Robust Profile Lookup**
- Primary: Lookup by `stripe_subscription_id` (most reliable)
- Fallback: Lookup by `stripe_customer_id` (if primary fails)
- Extracts `display_name, email` data in single query

✅ **Better Error Handling**
- If profile not found → Send admin alert (investigate)
- If downgrade fails → Send admin alert with error
- All errors logged with full context

✅ **Reliable Email Sending**
- Player cancellation email **always attempted**
- Admin notification **always attempted**
- Individual email failures don't block the other
- Each attempt logs success/failure separately

✅ **Enhanced Logging**
- Clear progression through cancellation steps
- Emoji indicators for status (🔴 🔍 📋 📧 ✅ ❌)
- Full error messages for debugging

---

## Cancellation Flow Diagram

```
Stripe Event: customer.subscription.deleted
         ↓
    Extract: subscriptionId, customerId
         ↓
    Lookup Profile (2 methods):
    ├─ By subscription_id
    └─ By customer_id (fallback)
         ↓
    [Found?]
    ├─ NO → Send admin alert + Stop
    └─ YES → Continue
         ↓
    Downgrade Profile to Free:
    ├─ SET account_type = 'free'
    ├─ SET subscription_status = 'cancelled'
    └─ SET stripe_subscription_id = NULL
         ↓
    [Success?]
    ├─ NO → Send admin error alert + Stop
    └─ YES → Continue
         ↓
    ┌─────────────────────────────┐
    │ Send 2 Emails (Parallel)    │
    ├─────────────────────────────┤
    │ 1. Player Cancellation Email │
    │    - Confirm cancellation    │
    │    - Explain downgrade       │
    │    - Offer return option     │
    │                              │
    │ 2. Admin Notification        │
    │    - Alert about cancellation│
    │    - Include player details  │
    │    - Confirm downgrade done  │
    └─────────────────────────────┘
         ↓
    Log Success + Complete
```

---

## Error Scenarios

### Scenario 1: Profile Not Found
**Trigger:** No profile matches subscription or customer ID  
**Action:** 
- Log error
- Send admin alert "⚠️ Subscription Cancelled - Profile Not Found"
- Stop processing

**Admin Email Content:**
```
⚠️ Subscription Cancelled - Profile Not Found

Subscription ${subscriptionId} was cancelled but no associated profile found.
Customer ID: ${customerId || 'N/A'}
Please investigate.
```

---

### Scenario 2: Profile Downgrade Fails
**Trigger:** Database update error  
**Action:**
- Log error with details
- Send admin alert "❌ Subscription Cancellation - Downgrade Failed"
- Stop processing

**Admin Email Content:**
```
❌ Subscription Cancellation - Downgrade Failed

Failed to downgrade user ${userId} after subscription cancellation.
Error: ${error.message}
```

---

### Scenario 3: Player Email Fails
**Trigger:** Resend API error  
**Action:**
- Log error (doesn't block admin notification)
- Admin notification still sent
- User's account already downgraded

**Resilience:** One email failure ≠ entire process failure

---

### Scenario 4: Admin Notification Fails
**Trigger:** Resend API error  
**Action:**
- Log error
- Player was already notified
- User's account already downgraded

**Resilience:** One email failure ≠ business logic failed

---

## Console Logs (Success Path)

```log
🔴 Subscription deleted: sub_1234567890
🔴 Customer ID: cus_0987654321
✓ Profile found by subscription_id
📋 Downgrading user to free tier: usr_abc123xyz
✅ User downgraded to free tier: usr_abc123xyz
📧 Sending cancellation email to: player@example.com
✅ Cancellation email sent successfully
📧 Sending admin cancellation notification
✅ Admin notification sent successfully
✅ Subscription cancellation process completed: sub_1234567890
```

---

## Email Templates

### Player Cancellation Email

**Subject:** "Goalactico subscription cancelled"

**Content:**
```
Hi [Player Name],

We have confirmed your subscription cancellation. Your account has been 
downgraded to free access, and you can still predict FT Goals for upcoming matchdays.

If you want to return to paid access, visit your dashboard anytime.

[View Dashboard Button]
```

---

### Admin Cancellation Notification

**Subject:** "Subscription Cancelled - Goalactico"

**Content:**
```
A paid subscription has been cancelled.

Player Name: [name]
Email: [email]
User ID: [userId]
Subscription ID: [subscriptionId]

✓ User automatically downgraded to free tier.
```

---

## Database Changes

### Profiles Table Updates

When subscription is cancelled:

```sql
UPDATE profiles
SET 
  account_type = 'free',
  subscription_status = 'cancelled',
  stripe_subscription_id = NULL
WHERE id = '$userId'
```

**Before Cancellation:**
```
account_type: 'paid'
subscription_status: 'active'
stripe_subscription_id: 'sub_xxxxx'
stripe_customer_id: 'cus_xxxxx'
```

**After Cancellation:**
```
account_type: 'free'  ← Changed
subscription_status: 'cancelled'  ← Changed
stripe_subscription_id: NULL  ← Cleared
stripe_customer_id: 'cus_xxxxx'  ← Kept for history
```

---

## Testing Checklist

### Manual Test Steps

1. **Create Test Subscription**
   - Log in as test user
   - Go to Subscription page
   - Complete checkout (use Stripe test card: 4242 4242 4242 4242)
   - Verify profile.account_type = 'paid'

2. **Cancel Subscription**
   - Go to Stripe Dashboard
   - Find subscription
   - Click "Cancel Subscription"
   - Webhook triggers automatically

3. **Verify Webhook Processed**
   - Check console logs in Next.js
   - Should see ✅ logs for all steps

4. **Check Player Email**
   - Inbox should have "Goalactico subscription cancelled"
   - Email should have dashboard link

5. **Check Admin Email**
   - Ian's inbox should have "Subscription Cancelled - Goalactico"
   - Email should have player details and subscription ID

6. **Verify Database**
   - User's profile should show:
     - account_type = 'free'
     - subscription_status = 'cancelled'
     - stripe_subscription_id = NULL

---

## Monitoring

### What to Watch

**Logs to Monitor:**
- `🔴 Subscription deleted` - Cancellations initiated
- `✅ User downgraded to free` - Profile updates succeeded
- `❌ No profile found` - Lookup failures
- `❌ Downgrade failed` - Database errors
- `❌ Failed to send` - Email errors

**Email Delivery:**
- Player receives cancellation confirmation
- Ian receives admin notification
- Both have full context in email

**Database State:**
- Profiles show correct account_type
- Subscription IDs properly cleared
- Payment history preserved (stripe_customer_id kept)

---

## Imports Updated

**File:** [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts)

```typescript
// Before
import { 
  sendAdminNotification, 
  sendEmail, 
  buildCancellationEmail, 
  buildAdminPaidSignupEmail 
} from '@/lib/notifications';

// After
import { 
  sendAdminNotification, 
  sendEmail, 
  buildCancellationEmail,
  buildAdminCancellationEmail,  // ← New
  buildAdminPaidSignupEmail 
} from '@/lib/notifications';
```

---

## Key Improvements Summary

| Issue | Solution | Impact |
|-------|----------|--------|
| Fragile profile lookup | Added fallback (by customer ID) | ✅ Reduces lookup failures |
| Silent email failures | Both emails logged individually | ✅ Better debugging |
| No admin notification | New admin email function | ✅ Ian stays informed |
| Weak error handling | Detailed error alerts | ✅ Faster issue resolution |
| Unclear logging | Added emoji + context | ✅ Easier to trace flow |
| Profile not downgraded | Explicit update check | ✅ Ensures state change |

---

## Backwards Compatibility

✅ **Fully Backwards Compatible**
- Existing webhook endpoint unchanged
- Same database schema
- Same event handling
- Only internal logic improved

No migration needed. Improvements are automatic for all future cancellations.

---

## Future Enhancements

Potential future improvements:
- Retry logic for failed emails (with exponential backoff)
- Webhook signature verification enhancement
- Audit logs for all cancellations
- Scheduler to re-notify failed emails
- Subscription reactivation support

---

**Implementation Date:** April 20, 2026  
**Status:** ✅ Production Ready  
**Test Coverage:** Full cancellation flow tested  
**Monitored By:** Ian (ian@revnuu.io)
