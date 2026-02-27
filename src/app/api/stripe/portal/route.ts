import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session so the user can manage/cancel subscription.
 * Requires Authorization: Bearer <supabase_jwt>.
 * Returns { url: string } to redirect the user to the Stripe billing portal.
 */
export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured (STRIPE_SECRET_KEY)' },
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
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id;
  if (!customerId || !customerId.startsWith('cus_')) {
    return NextResponse.json(
      { error: 'No active subscription. Subscribe first to manage billing.' },
      { status: 400 }
    );
  }

  const isPlaceholderKey =
    stripeSecretKey.includes('your-') ||
    stripeSecretKey === 'sk_test_your-stripe-secret-key' ||
    !/^sk_(test|live)_[a-zA-Z0-9]+$/.test(stripeSecretKey) ||
    stripeSecretKey.length < 30;
  if (isPlaceholderKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Add STRIPE_SECRET_KEY in .env.local.' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' });

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/paywall`,
    });
    return NextResponse.json({ url: session.url || '' });
  } catch (err) {
    console.error('Stripe portal error:', err);
    const message = err instanceof Error ? err.message : 'Portal failed';
    const safeMessage = message.includes('Invalid API Key') || message.includes('api_key')
      ? 'Stripe is not configured. Add valid STRIPE_SECRET_KEY in .env.local.'
      : message;
    return NextResponse.json(
      { error: safeMessage },
      { status: 500 }
    );
  }
}
