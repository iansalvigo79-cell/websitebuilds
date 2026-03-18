import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAfterCutoff } from '@/lib/predictionRules';

/**
 * POST /api/predictions/update
 * Body: { matchDayId: string, predicted_total_goals: number, predicted_half_time_goals?: number, predicted_ft_corners?: number, predicted_ht_corners?: number }
 * Server-side: ensures user is authenticated, match day is not locked, then upserts prediction.
 */
export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const adminSupabase = serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : null;

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { 
    matchDayId?: string
    predicted_total_goals?: number
    predicted_half_time_goals?: number | null
    predicted_ft_corners?: number | null
    predicted_ht_corners?: number | null
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { matchDayId, predicted_total_goals, predicted_half_time_goals, predicted_ft_corners, predicted_ht_corners } = body;
  if (!matchDayId || typeof predicted_total_goals !== 'number' || predicted_total_goals < 0) {
    return NextResponse.json(
      { error: 'matchDayId and a non-negative predicted_total_goals are required' },
      { status: 400 }
    );
  }

  const { data: matchDay, error: mdError } = await supabase
    .from('match_days')
    .select('id, cutoff_at')
    .eq('id', matchDayId)
    .single();

  if (mdError || !matchDay) {
    return NextResponse.json({ error: 'Match day not found' }, { status: 404 });
  }

  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select('kickoff_at')
    .eq('match_day_id', matchDayId)
    .order('kickoff_at', { ascending: true });

  if (gamesError) {
    return NextResponse.json({ error: 'Failed to load games' }, { status: 500 });
  }

  if (isAfterCutoff(matchDay.cutoff_at, games || [])) {
    return NextResponse.json(
      { error: 'Predictions are locked for this match day' },
      { status: 400 }
    );
  }

  const dbClient = adminSupabase ?? supabase;

  const { data: existingProfile, error: profileLookupError } = await dbClient
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (profileLookupError) {
    return NextResponse.json({ error: 'Failed to verify user profile' }, { status: 500 });
  }

  if (!existingProfile) {
    const fallbackName =
      (user.user_metadata as Record<string, string> | null)?.display_name
      || (user.user_metadata as Record<string, string> | null)?.name
      || user.email?.split('@')[0]
      || 'Player';
    const safeSuffix = user.id.slice(0, 8);
    const profilePayload: Record<string, string | number | null> = {
      id: user.id,
      display_name: fallbackName,
      team_name: `${fallbackName}-${safeSuffix}`,
      account_type: 'free',
      subscription_status: 'inactive',
      role: 0,
    };

    const { error: profileInsertError } = await dbClient
      .from('profiles')
      .insert(profilePayload);

    if (profileInsertError) {
      return NextResponse.json(
        { error: 'Profile missing. Please complete your profile setup.' },
        { status: 400 }
      );
    }
  }

  const { error: upsertError } = await dbClient
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        match_day_id: matchDayId,
        predicted_total_goals,
        predicted_half_time_goals: predicted_half_time_goals ?? null,
        predicted_ft_corners: predicted_ft_corners ?? null,
        predicted_ht_corners: predicted_ht_corners ?? null,
      },
      { onConflict: 'user_id,match_day_id' }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message || 'Failed to save prediction' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
