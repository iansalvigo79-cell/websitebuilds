import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for £5/month subscription.
 * Called from: paywall page (Subscribe Now button).
 * Requires Authorization: Bearer <supabase_jwt>.
 * Returns { url: string } to redirect the user to Stripe Checkout.
 *
 * Connection to profiles & predictions:
 * - Session is created with client_reference_id and metadata.user_id (current user id).
 * - After payment, Stripe sends checkout.session.completed to /api/stripe/webhook.
 * - Webhook updates profiles: stripe_customer_id, stripe_subscription_id, account_type = 'paid'.
 * - Paywall and predictions page read account_type from profiles to show paid state / unlock inputs.
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured (STRIPE_SECRET_KEY)' },
      { status: 500 }
    );
  }
  // Reject placeholder keys so Stripe never sees them (avoids "Invalid API Key" in UI)
  const isPlaceholderKey =
    stripeSecretKey.includes('your-') ||
    stripeSecretKey === 'sk_test_your-stripe-secret-key' ||
    !/^sk_(test|live)_[a-zA-Z0-9]+$/.test(stripeSecretKey) ||
    stripeSecretKey.length < 30;
  if (isPlaceholderKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add your Stripe secret key in .env.local (STRIPE_SECRET_KEY).' },
      { status: 500 }
    );
  }
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });

  try {
    // Line item: use STRIPE_PRICE_ID if it's a real Stripe price ID; else show "Goalactico · £5.00/month" via price_data
    const usePriceData =
      !stripePriceId ||
      stripePriceId.includes('your-') ||
      stripePriceId === 'price_your-monthly-price-id' ||
      !stripePriceId.startsWith('price_');
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = usePriceData
      ? [
          {
            price_data: {
              currency: 'gbp',
              product_data: {
                name: 'Goalactico',
                description: 'Full access to all four prediction games',
              },
              unit_amount: 500, // £5.00
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ]
      : [{ price: stripePriceId, quantity: 1 }];

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/paywall?canceled=1`,
      customer_email: user.email,
      // Required for webhook: so /api/stripe/webhook can update profiles (account_type, stripe_*) for this user
      client_reference_id: user.id,
      metadata: { user_id: user.id },
    });

    return NextResponse.json({ url: session.url || '' });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Checkout failed';
    // Don't expose raw "Invalid API Key provided: sk_test_***" to the client
    const safeMessage = message.includes('Invalid API Key') || message.includes('api_key')
      ? 'Stripe is not configured. Add valid STRIPE_SECRET_KEY and STRIPE_PRICE_ID in .env.local.'
      : message;
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
