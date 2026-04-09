import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/stripe/test-webhook
 * Manually trigger webhook logic for testing purposes.
 * This simulates a checkout.session.completed event.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { userId, customerId, subscriptionId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    console.log('🧪 Test webhook: Updating user', userId);

    // Simulate the webhook logic
    const updatePayload: Record<string, any> = {
      account_type: 'paid',
      subscription_status: 'active',
    };
    if (customerId) updatePayload.stripe_customer_id = customerId;
    if (subscriptionId) updatePayload.stripe_subscription_id = subscriptionId;

    const { data, error: updateError } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, account_type, stripe_customer_id, stripe_subscription_id');

    if (updateError) {
      console.error('❌ Test webhook update failed:', updateError.message);
      return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
    }

    console.log('✅ Test webhook: Profile updated successfully:', data);
    return NextResponse.json({ success: true, data });

  } catch (err) {
    console.error('❌ Test webhook error:', err);
    return NextResponse.json({ error: 'Test webhook failed' }, { status: 500 });
  }
}