import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/stripe/webhook
 * Stripe webhook: subscription created/updated/deleted.
 * Configure in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 * Use STRIPE_WEBHOOK_SECRET (signing secret for this endpoint).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    console.error('Stripe webhook: missing env (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, Supabase keys)');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });
  const supabase = createClient(supabaseUrl, serviceKey);

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        let session = event.data.object as Stripe.Checkout.Session;
        let userId: string | null =
          session.client_reference_id ||
          session.metadata?.user_id ||
          (session.metadata as Record<string, string> | undefined)?.userId ||
          null;
        let customerId: string | null =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        let subscriptionId: string | null =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as Stripe.Subscription)?.id ?? null;

        if (!userId || !customerId || !subscriptionId) {
          const retrieved = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['subscription'],
          });
          session = retrieved;
          userId =
            session.client_reference_id ||
            session.metadata?.user_id ||
            (session.metadata as Record<string, string> | undefined)?.userId ||
            null;
          customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
          subscriptionId =
            typeof session.subscription === 'string'
              ? session.subscription
              : (session.subscription as Stripe.Subscription)?.id ?? null;
        }

        if (userId && customerId && subscriptionId) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              subscription_status: 'active',
              account_type: 'paid',
            })
            .eq('id', userId);
          if (updateError) {
            console.error('Webhook profile update failed:', updateError);
          } else {
            console.log('Webhook: profile updated for user', userId);
          }
        } else {
          console.warn(
            'Stripe webhook checkout.session.completed: missing userId, customerId, or subscriptionId — profile not updated. ' +
              'Ensure checkout session is created with client_reference_id and metadata.user_id.',
            { userId, customerId, subscriptionId }
          );
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subscriptionId = sub.id;
        const status = sub.status;
        const isActive = status === 'active';
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_subscription_id', subscriptionId);

        if (profiles?.length) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              subscription_status: isActive ? 'active' : 'cancelled',
              account_type: isActive ? 'paid' : 'free',
              ...(event.type === 'customer.subscription.deleted' ? { stripe_subscription_id: null } : {}),
            })
            .eq('id', profiles[0].id);
          if (updateError) console.error('Webhook subscription profile update failed:', updateError);
        }
        break;
      }
      default:
        // Unhandled event type
        console.log('Unhandled event type:', event.type);
        break;
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
