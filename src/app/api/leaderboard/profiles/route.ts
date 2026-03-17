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

  const { userIds } = await request.json().catch(() => ({ userIds: [] }));
  const ids = Array.isArray(userIds)
    ? [...new Set(userIds.filter((id: unknown) => typeof id === 'string' && id.trim()))]
    : [];

  if (ids.length === 0) {
    return NextResponse.json({ profiles: {} }, { headers: { 'Cache-Control': 'no-store' } });
  }

  if (ids.length > 500) {
    return NextResponse.json({ error: 'Too many ids' }, { status: 400 });
  }

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);

  if (error) {
    return NextResponse.json({ error: 'Failed to load profiles' }, { status: 500 });
  }

  const profiles: Record<string, string | null> = {};
  (data || []).forEach((p: { id: string; display_name: string | null }) => {
    profiles[p.id] = p.display_name ?? null;
  });

  return NextResponse.json({ profiles }, { headers: { 'Cache-Control': 'no-store' } });
}
