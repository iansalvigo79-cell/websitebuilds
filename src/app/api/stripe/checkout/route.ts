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
 * After payment, Stripe calls /api/stripe/webhook which updates profiles:
 *   account_type = 'paid', stripe_customer_id, stripe_subscription_id
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID || '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  // ── Validate env vars ─────────────────────────────────────────────────────
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured (STRIPE_SECRET_KEY missing)' },
      { status: 500 }
    );
  }

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

  // ── Auth ──────────────────────────────────────────────────────────────────
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

  console.log('✅ Creating checkout for userId:', user.id);

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });

  try {
    // ── Line items ────────────────────────────────────────────────────────
    const usePriceData =
      !stripePriceId ||
      stripePriceId.includes('your-') ||
      stripePriceId === 'price_your-monthly-price-id' ||
      !stripePriceId.startsWith('price_');

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = usePriceData
      ? [{
        price_data: {
          currency: 'gbp',
          product_data: {
            name: 'Goalactico',
            description: 'Full access to all four prediction games',
          },
          unit_amount: 500,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }]
      : [{ price: stripePriceId, quantity: 1 }];

    // ── Create session ────────────────────────────────────────────────────
    // userId stored in THREE places so webhook always finds it reliably
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/paywall?canceled=1`,
      customer_email: user.email,
      client_reference_id: user.id,        // ← primary lookup in webhook
      metadata: {
        user_id: user.id,                    // ← fallback 1
        userId: user.id,                    // ← fallback 2
      },
    });

    console.log('✅ Session created:', session.id, 'for userId:', user.id);
    return NextResponse.json({ url: session.url || '' });

  } catch (err) {
    console.error('❌ Stripe checkout error:', err);
    const message = err instanceof Error ? err.message : 'Checkout failed';
    const safeMessage =
      message.includes('Invalid API Key') || message.includes('api_key')
        ? 'Stripe is not configured. Add valid keys in .env.local.'
        : message;
    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}