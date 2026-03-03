import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/stripe/webhook
 * Handles Stripe subscription events.
 * On checkout.session.completed → updates profiles:
 *   account_type = 'paid'
 *   stripe_customer_id = cus_xxx
 *   stripe_subscription_id = sub_xxx
 *
 * Configure in Stripe Dashboard → Webhooks.
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
  console.log('Incoming Stripe webhook...');
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // MUST be service role

  // ── Validate env vars ─────────────────────────────────────────────────────
  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error('❌ Webhook: missing env vars', {
      hasStripeKey: !!stripeSecretKey,
      hasWebhookSecret: !!webhookSecret,
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!serviceKey,
    });
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
  // Service role key bypasses RLS — required to update any user's profile
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log('Coming in Stripe Webhook.........');

  // ── Verify signature ──────────────────────────────────────────────────────
  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  console.log('✅ Webhook received:', event.type);

  try {
    switch (event.type) {

      // ── PAYMENT SUCCESSFUL ───────────────────────────────────────────────
      case 'checkout.session.completed': {
        let session = event.data.object as Stripe.Checkout.Session;
        console.log('session:', session)

        // Extract userId — checked in order of reliability
        let userId: string | null =
          session.client_reference_id ||            // ← most reliable
          session.metadata?.user_id ||              // ← fallback 1
          session.metadata?.userId ||               // ← fallback 2
          null;

        let customerId: string | null =
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer as Stripe.Customer)?.id ?? null;

        let subscriptionId: string | null =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id ?? null;

        // If any value missing, retrieve full session from Stripe API
        if (!userId || !customerId || !subscriptionId) {
          console.log('⚠️ Missing fields, retrieving full session from Stripe...');
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

        console.log('💳 userId:', userId);
        console.log('💳 customerId:', customerId);
        console.log('💳 subscriptionId:', subscriptionId);

        if (!userId) {
          console.error('❌ Cannot update profile — userId not found in session.');
          console.error('   Fix: ensure checkout session sets client_reference_id = user.id');
          break;
        }

        if (!customerId || !subscriptionId) {
          console.error('❌ Cannot update profile — customerId or subscriptionId missing.');
          break;
        }

        // ── Update all 3 columns in profiles table ──────────────────────
        const { data, error: updateError } = await supabase
          .from('profiles')
          .update({
            account_type: 'paid',          // ← unlocks all 4 prediction games
            stripe_customer_id: customerId,       // ← e.g. cus_xxx
            stripe_subscription_id: subscriptionId,  // ← e.g. sub_xxx
            subscription_status: 'active',         // ← bonus: tracks status
          })
          .eq('id', userId)
          .select('id, account_type, stripe_customer_id, stripe_subscription_id');

        if (updateError) {
          console.error('❌ Supabase update failed:', updateError.message);
          return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
        }

        console.log('✅ Profile updated successfully:', data);
        break;
      }

      // ── SUBSCRIPTION CANCELLED OR EXPIRED ────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;

        console.log('🔴 Subscription deleted:', subscriptionId);

        // Find profile by subscription ID
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscriptionId);

        if (!profiles?.length) {
          console.warn('⚠️ No profile found for subscriptionId:', subscriptionId);
          break;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            account_type: 'free',   // ← revoke paid access
            subscription_status: 'cancelled',
            stripe_subscription_id: null,     // ← clear subscription ID
          })
          .eq('id', profiles[0].id);

        if (updateError) {
          console.error('❌ Downgrade failed:', updateError.message);
        } else {
          console.log('✅ User downgraded to free:', profiles[0].id);
        }
        break;
      }

      // ── SUBSCRIPTION UPDATED (e.g. reactivated, past_due) ────────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const isActive = sub.status === 'active';

        console.log('🔄 Subscription updated:', subscriptionId, '| status:', sub.status);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscriptionId);

        if (!profiles?.length) {
          console.warn('⚠️ No profile found for subscriptionId:', subscriptionId);
          break;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            account_type: isActive ? 'paid' : 'free',
            subscription_status: isActive ? 'active' : sub.status,
          })
          .eq('id', profiles[0].id);

        if (updateError) {
          console.error('❌ Subscription update failed:', updateError.message);
        } else {
          console.log('✅ Profile updated for subscription change:', profiles[0].id);
        }
        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type);
        break;
    }
  } catch (err) {
    console.error('❌ Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}