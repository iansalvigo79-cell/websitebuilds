import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendAdminNotification, buildWelcomeEmail as buildPaidActivationEmail, buildAdminPaidSignupEmail } from '@/lib/notifications';
import { subscriptionCancelledEmail } from '@/lib/email-templates';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/stripe/webhook
 * Handles Stripe subscription events.
 * On checkout.session.completed â†’ updates profiles:
 *   account_type = 'paid'
 *   stripe_customer_id = cus_xxx
 *   stripe_subscription_id = sub_xxx
 *
 * Configure in Stripe Dashboard â†’ Webhooks.
 * Events to enable:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// allow GET so frontend pings don't 405
export async function GET() {
  return NextResponse.json({ received: true });
}

export async function POST(request: NextRequest) {
  const requestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  const log = (...args: any[]) => console.log(`[stripe-webhook:${requestId}]`, ...args);
  const warn = (...args: any[]) => console.warn(`[stripe-webhook:${requestId}]`, ...args);
  const errLog = (...args: any[]) => console.error(`[stripe-webhook:${requestId}]`, ...args);

  log('Incoming Stripe webhook request');
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST be service role

  // â”€â”€ Validate env vars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!stripeSecretKey || !supabaseUrl || !serviceKey) {
    errLog('Webhook: missing env vars', {
      hasStripeKey: !!stripeSecretKey,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
    });
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
  // Service role key bypasses RLS â€” required to update any user's profile
  const supabase = createClient(supabaseUrl, serviceKey);

  async function getAuthEmailByUserId(userId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) {
        console.warn('Failed to fetch auth user email:', error.message);
        return null;
      }
      return data.user?.email ?? null;
    } catch (err) {
      console.warn('Failed to fetch auth user email:', err);
      return null;
    }
  }

  async function findProfileIdByStripe(customerId?: string | null, subscriptionId?: string | null, email?: string | null) {
    if (subscriptionId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_subscription_id', subscriptionId)
        .limit(1);
      if (!error && data?.length) return data[0].id;
    }
    if (customerId) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1);
      if (!error && data?.length) return data[0].id;
    }
    if (email) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .limit(1);
      if (!error && data?.length) return data[0].id;
    }
    return null;
  }

  async function updateProfilePaid(userId: string, customerId: string, subscriptionId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        account_type: 'paid',
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
      })
      .eq('id', userId)
      .select('id, email, display_name');

    if (error) {
      console.error('âŒ Supabase update failed:', error.message);
      return null;
    }
    return data?.[0] ?? null;
  }

  console.log('Coming in Stripe Webhook.........');

  // â”€â”€ Check if this is a test request â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const isTestRequest = request.headers.get('x-test-webhook') === 'true';

  let event: Stripe.Event;
  if (isTestRequest) {
    // For testing: parse the request body directly as a mock event
    const rawBody = await request.text();
    try {
      event = JSON.parse(rawBody) as Stripe.Event;
      log('Test webhook received:', event.type);
    } catch (err) {
      errLog('Invalid test webhook data:', err);
      return NextResponse.json({ error: 'Invalid test data' }, { status: 400 });
    }
  } else {
    // â”€â”€ Verify signature for production â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature') || '';

    try {
      if (!webhookSecret) {
        warn('No STRIPE_WEBHOOK_SECRET configured; skipping signature verification');
        const mockEvent = JSON.parse(rawBody);
        event = mockEvent as Stripe.Event;
      } else {
        event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      }
    } catch (err) {
      errLog('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  }

  log('Webhook received:', { type: event.type, id: event.id });

  try {
    switch (event.type) {

      // â”€â”€ PAYMENT SUCCESSFUL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        let session = event.data.object as Stripe.Checkout.Session;
        console.log('session:', session);

        let userId: string | null =
          session.client_reference_id ||
          session.metadata?.user_id ||
          session.metadata?.userId ||
          null;

        let customerId: string | null =
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer)?.id ?? null;

        let subscriptionId: string | null =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id ?? null;

        if (!userId || !customerId || !subscriptionId) {
          console.log('âš ï¸ Missing fields, retrieving full session from Stripe...');
          const retrieved = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['subscription', 'customer'],
          });
          session = retrieved;

          userId =
            session.client_reference_id ||
            session.metadata?.user_id ||
            session.metadata?.userId ||
            null;

          customerId =
            typeof session.customer === 'string'
              ? session.customer
              : (session.customer as Stripe.Customer)?.id ?? null;

          subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : (session.subscription as Stripe.Subscription)?.id ?? null;
        }

        const customerEmail =
          typeof session.customer === 'object'
            ? (session.customer as Stripe.Customer).email ?? null
            : null;

        console.log('ðŸ’³ userId:', userId);
        console.log('ðŸ’³ customerId:', customerId);
        console.log('ðŸ’³ subscriptionId:', subscriptionId);
        console.log('ðŸ’³ customerEmail:', customerEmail);

        if (!userId) {
          userId = await findProfileIdByStripe(customerId, subscriptionId, customerEmail);
          if (userId) {
            console.log('âœ… Found profile by Stripe identifiers:', userId);
          }
        }

        if (!userId) {
          console.error('âŒ Cannot update profile â€” userId not found in session or profile lookup.');
          break;
        }

        if (!customerId || !subscriptionId) {
          console.error('âŒ Cannot update profile â€” customerId or subscriptionId missing.');
          break;
        }

        const profileData = await updateProfilePaid(userId, customerId, subscriptionId);
        if (!profileData) {
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log('âœ… Profile updated successfully:', profileData);
        // Best-effort: notify the player that Pro access is active.
        try {
          const displayName = profileData.display_name || 'Player';
          const sessionEmail =
            session.customer_details?.email ||
            session.customer_email ||
            customerEmail ||
            null;
          const authEmail = await getAuthEmailByUserId(userId);
          const recipientEmail = sessionEmail || profileData.email || authEmail;

          if (recipientEmail) {
            const { subject, html, text } = buildPaidActivationEmail(displayName);
            await sendEmail({ to: recipientEmail, subject, html, text });
            console.log('Ã¢Å“â€¦ Paid activation email sent to:', recipientEmail);
          } else {
            console.warn('Ã¢Å¡Â Ã¯Â¸Â No email found for player, skipping paid activation email');
          }
        } catch (emailErr) {
          console.warn('Ã¢Å¡Â Ã¯Â¸Â Paid activation email failed:', emailErr);
        }

        try {
          const displayName = profileData.display_name || null;
          const authEmail = await getAuthEmailByUserId(userId);
          const email = profileData.email || authEmail || null;
          const { subject, html, text } = buildAdminPaidSignupEmail(displayName, userId, email);
          await sendAdminNotification(subject, text, html);
        } catch (notifyErr) {
          console.warn('âš ï¸ Paid signup notification failed:', notifyErr);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | Stripe.Subscription };
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : (invoice.subscription as Stripe.Subscription)?.id ?? null;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : (invoice.customer as Stripe.Customer)?.id ?? null;
        const customerEmail =
          typeof invoice.customer === 'object'
            ? (invoice.customer as Stripe.Customer).email ?? null
            : null;

        if (!subscriptionId && !customerId && !customerEmail) {
          console.error('âŒ Invoice event missing subscription and customer identifiers.');
          break;
        }

        const profileId = await findProfileIdByStripe(customerId, subscriptionId, customerEmail);
        if (!profileId) {
          console.warn('âš ï¸ No profile found for invoice payment succeeded event.');
          break;
        }

        const { error: payUpdateError } = await supabase
          .from('profiles')
          .update({
            account_type: 'paid',
            subscription_status: 'active',
            stripe_subscription_id: subscriptionId ?? undefined,
            stripe_customer_id: customerId ?? undefined,
          })
          .eq('id', profileId);

        if (payUpdateError) {
          console.error('âŒ Invoice profile update failed:', payUpdateError.message);
        } else {
          console.log('âœ… Profile updated after invoice payment:', profileId);
        }
        break;
      }

      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as Stripe.Customer)?.id ?? null;

        const profileId = await findProfileIdByStripe(customerId, subscriptionId, null);
        if (!profileId) {
          console.warn('âš ï¸ No profile found for subscription.created event:', subscriptionId);
          break;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId ?? undefined,
            subscription_status: sub.status === 'active' ? 'active' : sub.status,
            account_type: sub.status === 'active' ? 'paid' : 'free',
          })
          .eq('id', profileId);

        if (updateError) {
          console.error('âŒ Subscription.created profile update failed:', updateError.message);
        } else {
          console.log('âœ… Profile updated for subscription.created:', profileId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : (subscription.customer as Stripe.Customer)?.id ?? null;

        if (!customerId) {
          console.error('[Webhook] subscription.updated - missing stripe customer id');
          break;
        }

        if (subscription.cancel_at_period_end === false) {
          const periodEndTimestamp =
            subscription.cancel_at ??
            subscription.items.data[0]?.current_period_end ??
            null;

          if (!periodEndTimestamp) {
            console.error('[Webhook] subscription.updated - missing period end timestamp:', {
              customerId,
              subscriptionId: subscription.id,
            });
            break;
          }

          const periodEnd = new Date(periodEndTimestamp * 1000)
            .toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('stripe_customer_id', customerId)
            .single();

          if (profileError) {
            console.error('[Webhook] subscription.updated - profile fetch error:', profileError);
          }

          console.log(`profile:`, profile);

          if (profile?.email) {
            try {
              const { subject, html, text } = subscriptionCancelledEmail(
                profile.display_name || 'Player',
                periodEnd
              );
              await sendEmail({ to: profile.email, subject, html, text });
              await sendAdminNotification(subject, text, html);
              console.log(`[Webhook] Cancellation email sent to ${profile.email} - access until ${periodEnd}`);
            } catch (emailErr) {
              console.error('[Webhook] Failed to send cancellation email:', emailErr);
            }
          }
        }

        if (subscription.cancel_at_period_end === false && subscription.status === 'active') {
          const { error: reactivateError } = await supabase
            .from('profiles')
            .update({
              account_type: 'paid',
              subscription_status: 'active',
            })
            .eq('stripe_customer_id', customerId);

          if (reactivateError) {
            console.error('[Webhook] subscription.updated - reactivation update error:', reactivateError);
          } else {
            console.log(`[Webhook] Subscription reactivated for customer ${customerId}`);
          }
        }

        if (subscription.status === 'past_due') {
          console.warn(`[Webhook] Subscription past_due for customer ${customerId}`);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : (subscription.customer as Stripe.Customer)?.id ?? null;

        if (!customerId) {
          console.error('[Webhook] subscription.deleted - missing stripe customer id');
          break;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            account_type: 'free',
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          })
          .eq('stripe_customer_id', customerId);

        if (updateError) {
          console.error('[Webhook] subscription.deleted - profile update error:', updateError);
        } else {
          console.log(`[Webhook] Subscription deleted - removed Pro access for customer ${customerId}`);
        }

        break;
      }

      default:
        log('Unhandled event type:', event.type);
        break;
    }
  } catch (err) {
    errLog('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
