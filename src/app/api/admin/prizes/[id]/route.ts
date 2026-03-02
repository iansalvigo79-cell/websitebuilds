import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/admin/prizes/[id]
 * Update a prize: status (awarded) and/or prize_description.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Prize id required' }, { status: 400 });
  }

  let body: { status?: string; prize_description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const updates: { status?: string; prize_description?: string } = {};
  if (body.status !== undefined) {
    if (body.status !== 'pending' && body.status !== 'awarded') {
      return NextResponse.json({ error: 'status must be pending or awarded' }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.prize_description !== undefined) {
    updates.prize_description = body.prize_description;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from('prizes')
    .update(updates)
    .eq('id', id)
    .select('id, type, period, winner_user_id, prize_description, status, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/**
 * DELETE /api/admin/prizes/[id]
 * Soft "cancel" flow for admin UI – removes a pending prize.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Prize id required' }, { status: 400 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase.from('prizes').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
