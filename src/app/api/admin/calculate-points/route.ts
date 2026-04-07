import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculatePoints } from '@/lib/pointsCalculator';
import { sendAdminNotification, sendEmail, buildMatchdayResultsEmail, buildAdmin40PointEmail } from '@/lib/notifications';

/**
 * POST /api/admin/calculate-points
 * Body: { matchDayId?: string } - optional; if omitted, runs for all match days that have scores set.
 * Header: x-admin-secret - optional; set to ADMIN_SECRET env to protect the endpoint.
 *
 * For each match day with scores set:
 * 1. Load all predictions for that match day.
 * 2. Compute points for each game type where actual scores exist.
 * 3. Update the predictions table with points per game type.
 */
const SERVICE_ROLE_ERROR =
  'Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Supabase Dashboard  †’ Project Settings  †’ API  †’ service_role secret). Restart the dev server after saving.';

export async function POST(request: NextRequest) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (adminSecret) {
    const headerSecret = request.headers.get('x-admin-secret');
    if (headerSecret !== adminSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  } else {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const { createClient } = await import('@supabase/supabase-js');
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: SERVICE_ROLE_ERROR },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: {
    matchDayId?: string;
    actual_total_goals?: number | null;
    ht_goals?: number | null;
    total_corners?: number | null;
    ht_corners?: number | null;
  } = {};
  try {
    body = await request.json();
  } catch {
    // no body is ok
  }

  try {
    if (body.matchDayId) {
      const update: Record<string, number | null> = {};
      if (Object.prototype.hasOwnProperty.call(body, 'actual_total_goals')) {
        update.actual_total_goals = body.actual_total_goals ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'ht_goals')) {
        update.ht_goals = body.ht_goals ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'total_corners')) {
        update.total_corners = body.total_corners ?? null;
      }
      if (Object.prototype.hasOwnProperty.call(body, 'ht_corners')) {
        update.ht_corners = body.ht_corners ?? null;
      }

      if (Object.keys(update).length > 0) {
        const { error: updateErr } = await supabase
          .from('match_days')
          .update(update)
          .eq('id', body.matchDayId);
        if (updateErr) {
          return NextResponse.json({ error: updateErr.message }, { status: 500 });
        }
      }
    }

    let matchDays: { id: string; name?: string | null; match_date?: string | null; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null }[];

    if (body.matchDayId) {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, name, match_date, actual_total_goals, ht_goals, total_corners, ht_corners')
        .eq('id', body.matchDayId)
        .limit(1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      matchDays = (data || []) as { id: string; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null }[];
    } else {
      const { data, error } = await supabase
        .from('match_days')
        .select('id, name, match_date, actual_total_goals, ht_goals, total_corners, ht_corners')
        .or('actual_total_goals.not.is.null,ht_goals.not.is.null,total_corners.not.is.null,ht_corners.not.is.null');

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      matchDays = (data || []) as { id: string; actual_total_goals: number | null; ht_goals: number | null; total_corners: number | null; ht_corners: number | null }[];
    }

    let totalUpdated = 0;
    const userIds = new Set<string>();
    const matchDayTitles: string[] = [];
    const fortyPointAchievements: Array<{ user_id: string; match_day_id: string; totalPoints: number }> = [];

    for (const md of matchDays) {
      const actual = md.actual_total_goals;
      const htGoals = md.ht_goals;
      const totalCorners = md.total_corners;
      const htCorners = md.ht_corners;
      matchDayTitles.push(md.name || md.match_date || md.id);

      let predictions: any[] | null = null;
      const { data: primaryPreds, error: fetchErr } = await supabase
        .from('predictions')
        .select('id, user_id, match_day_id, points, ht_goals_points, corners_points, ht_corners_points, predicted_total_goals, predicted_half_time_goals, predicted_ht_goals, predicted_ft_corners, predicted_total_corners, predicted_ht_corners')
        .eq('match_day_id', md.id);

      if (!fetchErr) {
        predictions = primaryPreds as any[];
      } else {
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('predictions')
          .select('id, user_id, match_day_id, points, ht_goals_points, corners_points, ht_corners_points, predicted_total_goals, predicted_half_time_goals, predicted_ft_corners, predicted_ht_corners')
          .eq('match_day_id', md.id);
        if (!fallbackErr) {
          predictions = fallbackData as any[];
        } else {
          const { data: altData, error: altErr } = await supabase
            .from('predictions')
            .select('id, user_id, match_day_id, points, ht_goals_points, corners_points, ht_corners_points, predicted_total_goals, predicted_ht_goals, predicted_total_corners, predicted_ht_corners')
            .eq('match_day_id', md.id);
          if (altErr) {
            console.error('fetch predictions error', md.id, altErr);
            continue;
          }
          predictions = altData as any[];
        }
      }

      for (const p of predictions || []) {
        if (!p.user_id) continue;
        userIds.add(p.user_id);

        const update: Record<string, number | null> = {};
        const htPred = p.predicted_half_time_goals ?? p.predicted_ht_goals ?? null;
        const ftCornersPred = p.predicted_ft_corners ?? p.predicted_total_corners ?? null;
        const htCornersPred = p.predicted_ht_corners ?? null;
        if (actual != null) {
          update.points = p.predicted_total_goals != null ? calculatePoints(p.predicted_total_goals, actual) : null;
        }
        if (htGoals != null) {
          update.ht_goals_points = htPred != null ? calculatePoints(htPred, htGoals) : null;
        }
        if (totalCorners != null) {
          update.corners_points = ftCornersPred != null ? calculatePoints(ftCornersPred, totalCorners) : null;
        }
        if (htCorners != null) {
          update.ht_corners_points = htCornersPred != null ? calculatePoints(htCornersPred, htCorners) : null;
        }
        if (Object.keys(update).length === 0) continue;

        const { error: updateErr } = await supabase
          .from('predictions')
          .update(update)
          .eq('id', p.id);

        if (!updateErr) {
          totalUpdated += 1;

          const points = update.points ?? p.points ?? 0;
          const htGoalsPoints = update.ht_goals_points ?? p.ht_goals_points ?? 0;
          const cornersPoints = update.corners_points ?? p.corners_points ?? 0;
          const htCornersPoints = update.ht_corners_points ?? p.ht_corners_points ?? 0;
          const totalPoints = points + htGoalsPoints + cornersPoints + htCornersPoints;

          if (totalPoints >= 40) {
            fortyPointAchievements.push({
              user_id: p.user_id,
              match_day_id: md.id,
              totalPoints,
            });
          }
          continue;
        }

        const errMsg = updateErr.message?.toLowerCase() || '';
        const missingCols: string[] = [];
        if (errMsg.includes('ht_goals_points') && errMsg.includes('does not exist')) {
          missingCols.push('ht_goals_points');
        }
        if (errMsg.includes('corners_points') && errMsg.includes('does not exist')) {
          missingCols.push('corners_points');
        }
        if (errMsg.includes('ht_corners_points') && errMsg.includes('does not exist')) {
          missingCols.push('ht_corners_points');
        }
        if (missingCols.length > 0) {
          return NextResponse.json(
            { error: `predictions table missing columns: ${missingCols.join(', ')}` },
            { status: 500 }
          );
        }

        console.error('Failed to update prediction', p.id, updateErr);
      }
    }

    if (userIds.size > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', Array.from(userIds));

      if (!profileError && profiles?.length) {
        const recipients = profiles.filter((profile) => profile.email).map((profile) => ({
          email: profile.email as string,
          displayName: profile.display_name || 'Player',
        }));

        const { subject, html, text } = buildMatchdayResultsEmail(matchDayTitles);
        await Promise.allSettled(
          recipients.map((recipient) =>
            sendEmail({
              to: recipient.email,
              subject,
              html,
              text,
            })
          )
        );
      }
    }

    if (fortyPointAchievements.length > 0) {
      const uniqueUserIds = Array.from(new Set(fortyPointAchievements.map((item) => item.user_id)));
      const { data: achieverProfiles, error: achieverError } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', uniqueUserIds);

      const matchDayMap = new Map<string, string>(matchDays.map((md) => [md.id, md.name || md.match_date || md.id]));
      const achieverDetails = fortyPointAchievements.map((item) => ({
        userId: item.user_id,
        displayName: achieverProfiles?.find((profile) => profile.id === item.user_id)?.display_name || null,
        matchDayTitle: matchDayMap.get(item.match_day_id) || item.match_day_id,
      }));

      if (!achieverError && achieverDetails.length > 0) {
        try {
          const { subject, html, text } = buildAdmin40PointEmail(achieverDetails);
          await sendAdminNotification(subject, text, html);
        } catch (notifyErr) {
          console.warn('⚠️ 40-point admin notification failed:', notifyErr);
        }
      }
    }

    console.log(totalUpdated);

    return NextResponse.json({
      ok: true,
      matchDaysProcessed: matchDays.length,
      predictionsUpdated: totalUpdated,
    });
  } catch (err) {
    console.error('calculate-points error', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

