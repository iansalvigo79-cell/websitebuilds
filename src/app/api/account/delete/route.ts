import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '') || null;
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const predictionsRes = await supabase.from('predictions').delete().eq('user_id', user.id);
    if (predictionsRes.error) {
      console.warn('Predictions delete warning:', predictionsRes.error.message);
    }

    const prizeRes = await supabase.from('prize_winners').delete().eq('user_id', user.id);
    if (prizeRes.error) {
      console.warn('Prize winners delete warning:', prizeRes.error.message);
    }

    const profileRes = await supabase.from('profiles').delete().eq('id', user.id);
    if (profileRes.error) {
      return NextResponse.json({ error: profileRes.error.message }, { status: 500 });
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Account deletion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
