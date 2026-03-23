import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/prizes
 * List all prizes (admin). Uses service role to bypass RLS.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from('prizes')
    .select('id, type, period, winner_user_id, prize_description, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const prizes = data || [];
  const winnerIds = [...new Set(prizes.map((p: { winner_user_id: string }) => p.winner_user_id).filter(Boolean))];
  const winnerNames: Record<string, string> = {};

  if (winnerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', winnerIds);
    (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
      const trimmed = p.display_name?.trim();
      winnerNames[p.id] = trimmed && trimmed.length > 0 ? trimmed : p.id.slice(0, 8) + '...';
    });
  }

  const withNames = prizes.map((prize: any) => ({
    ...prize,
    winner_display_name: winnerNames[prize.winner_user_id] ?? prize.winner_user_id.slice(0, 8) + '...',
  }));

  return NextResponse.json({ prizes: withNames });
}

/**
 * POST /api/admin/prizes
 * Create a new prize (pending). Body: { type, period, winner_user_id, prize_description? }
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  let body: { type?: string; period?: string; winner_user_id?: string; prize_description?: string; points_threshold?: string | number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const type = body.type?.trim();
  let period = body.period?.trim();
  const winner_user_id = body.winner_user_id;
  const prize_description = body.prize_description ?? null;

  if (!type || !winner_user_id) {
    return NextResponse.json(
      { error: 'Missing required fields: type, winner_user_id' },
      { status: 400 }
    );
  }
  if (!['weekly', 'monthly', 'seasonal', 'player'].includes(type)) {
    return NextResponse.json({ error: 'type must be weekly, monthly, seasonal, or player' }, { status: 400 });
  }
  if (type === 'player') {
    const rawThreshold = body.points_threshold ?? period ?? '';
    const parsed = parseInt(String(rawThreshold).trim(), 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json({ error: 'points_threshold must be a positive number' }, { status: 400 });
    }
    period = String(parsed);
  } else if (!period) {
    return NextResponse.json(
      { error: 'Missing required fields: period' },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from('prizes')
    .insert({
      type,
      period,
      winner_user_id,
      prize_description,
      status: 'pending',
    })
    .select('id, type, period, winner_user_id, prize_description, status, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}
