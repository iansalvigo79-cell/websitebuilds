# Email Notification Debug Checklist

**Issue:** Matchday results email not being sent when calculating points

---

## Root Cause Analysis

The recipients array is empty because one of these conditions is true:

### 1. ❌ No Predictions Exist
**What to check:**
- Navigate to **Admin → Calculate Points**
- Check browser console logs for: `📊 Matchday "[name]": Found X predictions`
- If X = 0, then no users have made predictions for this matchday

**Solution:**
- Create at least one prediction for the matchday
- Go to **Dashboard → Predictions** 
- Make a prediction for the matchday with scores set
- Then run calculate points again

---

### 2. ❌ Profiles Have No Email Addresses
**What to check:**
- After clicking calculate points, check browser console for: `📧 Recipients with valid emails: X`
- If X = 0 but matchday has predictions, profiles are missing emails

**How to verify in Supabase:**
1. Go to Supabase Dashboard
2. Open `profiles` table
3. Check if `email` column has data for users with predictions
4. If emails are NULL/empty, that's the problem

**Solution:**
- Update profiles with email addresses
- Run SQL query in Supabase:
```sql
SELECT id, display_name, email FROM profiles WHERE id IN (
  SELECT DISTINCT user_id FROM predictions
) AND (email IS NULL OR email = '');
```
- Add missing emails to these profiles

---

### 3. ❌ Matchday Has No Scores Set
**What to check:**
- The matchday must have actual scores set first
- In Admin → Matchdays, verify at least one of these is set:
  - Actual Total Goals
  - HT Goals
  - Total Corners
  - HT Corners

**Solution:**
- Set the actual match scores first
- Then click "Calculate Points"

---

## Console Logs to Check

After clicking "Calculate Points", check browser console (F12 → Console tab) for these logs:

### Expected Flow (Success):
```
🔍 Processing X matchdays...
📊 Matchday "Matchday 1": Found 5 predictions
📊 Matchday "Matchday 2": Found 3 predictions
📧 Fetching profiles for 8 users with predictions...
📧 Profiles fetched: 8 total
📧 Sample profile data: [...]
📧 Recipients with valid emails: 8
📧 Sending matchday results email to 8 recipients
✅ Email sent to user1@example.com
✅ Email sent to user2@example.com
...
📧 Matchday results email batch completed
```

### Problem Indicators:
```
📊 Matchday "Matchday 1": Found 0 predictions
← No predictions exist

📧 Recipients with valid emails: 0
← Predictions exist but profiles have no emails

❌ Failed to send email to user@example.com
← Email service issue or invalid email
```

---

## Fix Summary

**Type 1: No Predictions**
→ Users must place predictions before scores are set
→ Then admin calculates points

**Type 2: Missing Emails in Profiles**
→ Update the profiles table to include email addresses for all users
→ Verify with: `SELECT COUNT(*) FROM profiles WHERE email IS NOT NULL;`

**Type 3: No Scores Set on Matchday**
→ Admin must set actual match scores first
→ Then calculate points

---

## Quick Test

To test email functionality:

1. **Make a Prediction:**
   - Log in as user
   - Go to Predictions page
   - Make a prediction for today's matchday

2. **Set Scores (Admin):**
   - Go to Admin → Matchdays
   - Find today's matchday
   - Set "Actual Total Goals" to any number

3. **Calculate Points:**
   - Click "Calculate Points for All Matchdays"
   - Check console logs
   - Check email inbox (may take 1-2 seconds)

---

## Email Queue Verification

The system sends emails via Resend API.

**Check if emails were queued:**
- Console shows: `✅ Email sent to...` → Email was sent to Resend
- Check Resend Dashboard: https://resend.com/emails
- Look for email with subject: "Results are in — your Goalactico scores have been calculated"

**If emails sent but not received:**
- Check spam/junk folder
- Verify email address in profiles is correct
- Check Resend logs for delivery status

---

## Data Structure Validation

**Predictions Table Should Have:**
- `user_id` - Link to user
- `match_day_id` - Link to matchday
- `predicted_total_goals` - User's prediction
- `predicted_ht_goals` - User's HT prediction (optional)
- `predicted_total_corners` - User's corners prediction (optional)

**Profiles Table Should Have:**
- `id` - User ID
- `email` - User's email address
- `display_name` - User's display name

**Match Days Table Should Have:**
- `id` - Matchday ID
- `name` - Matchday name (e.g., "Matchday 1")
- `actual_total_goals` - Actual FT goals (set by admin)
- `ht_goals` - Actual HT goals (optional)
- `total_corners` - Actual total corners (optional)

---

## Action Items

✅ Run calculate points and check console logs  
✅ Verify predictions exist for the matchday  
✅ Verify profiles have email addresses  
✅ Verify matchday has actual scores set  
✅ Check Resend email delivery dashboard  

**Report back with:**
1. Number of predictions found: `📊 Matchday: Found X predictions`
2. Number of profiles fetched: `📧 Profiles fetched: X total`
3. Number of recipients with emails: `📧 Recipients with valid emails: X`

This will help identify exactly where the issue is!
