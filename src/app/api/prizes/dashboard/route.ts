import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export interface PrizeWithProfile {
  id: string;
  type: string;
  period: string;
  winner_user_id: string;
  prize_description: string | null;
  status: string;
  created_at: string;
  profiles?: { display_name: string | null } | null;
}

/**
 * GET /api/prizes/dashboard
 * Returns active (pending) prize, last 3 awarded prizes, and current user's pending prize.
 * Uses service role so dashboard can show all prizes. Requires auth to get user id for userPrize.
 */
export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAuth = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const [{ data: activePrizeRow }, { data: recentRows }, { data: userPrizeRow }] = await Promise.all([
    supabase
      .from('prizes')
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('prizes')
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .eq('status', 'awarded')
      .order('created_at', { ascending: false })
      .limit(3),
    supabase
      .from('prizes')
      .select('id, type, period, winner_user_id, prize_description, status, created_at')
      .eq('winner_user_id', user.id)
      .eq('status', 'pending')
      .limit(1)
      .maybeSingle(),
  ]);

  const winnerIds = new Set<string>();
  if (activePrizeRow?.winner_user_id) winnerIds.add(activePrizeRow.winner_user_id);
  (recentRows || []).forEach((r) => r.winner_user_id && winnerIds.add(r.winner_user_id));

  let profilesMap: Record<string, string> = {};
  if (winnerIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', [...winnerIds]);
    (profiles || []).forEach((p: { id: string; display_name: string | null }) => {
      profilesMap[p.id] = p.display_name ?? p.id.slice(0, 8) + '…';
    });
  }

  const activePrize: PrizeWithProfile | null = activePrizeRow
    ? {
        ...activePrizeRow,
        profiles: activePrizeRow.winner_user_id
          ? { display_name: profilesMap[activePrizeRow.winner_user_id] ?? null }
          : null,
      }
    : null;

  const recentWinners: PrizeWithProfile[] = (recentRows || []).map((r) => ({
    ...r,
    profiles: r.winner_user_id ? { display_name: profilesMap[r.winner_user_id] ?? null } : null,
  }));

  const userPrize = userPrizeRow ?? null;

  return NextResponse.json({ activePrize, recentWinners, userPrize });
}
