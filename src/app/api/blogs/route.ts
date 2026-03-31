import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Anon client for public queries
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Service role client for admin verification (bypasses RLS)
const adminSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Helper function to verify JWT token and extract user ID
function extractUserIdFromToken(token: string): string | null {
  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode the payload (second part) using Node.js Buffer
    const payload = parts[1];
    // Add padding if needed for base64
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decoded = Buffer.from(padded, 'base64').toString('utf-8');
    const json = JSON.parse(decoded);
    
    return json.sub || null; // Supabase JWT uses 'sub' for user ID
  } catch (err) {
    console.error('Token decode error:', err);
    return null;
  }
}

/**
 * GET /api/blogs
 * Get all published blogs with optional filtering
 * Query params:
 * - category: 'Strategy' | 'Preview' | 'Analysis' (optional)
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const includeDraftsParam = (searchParams.get('includeDrafts') || '').toLowerCase();
    const includeDrafts = includeDraftsParam === 'true' || includeDraftsParam === '1';

    let isAdmin = false;
    if (includeDrafts) {
      const authHeader = req.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const userId = extractUserIdFromToken(token);
        if (userId) {
          const { data: profile } = await adminSupabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
          isAdmin = !!profile && profile.role === 1;
        }
      }
    }

    let query = adminSupabase
      .from('blogs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!(includeDrafts && isAdmin)) {
      query = query.eq('is_published', true);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error, count } = await query
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      blogs: data || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (err) {
    console.error('Error fetching blogs:', err);
    return NextResponse.json(
      { error: 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/blogs
 * Create a new blog (admin only)
 * Body:
 * {
 *   title: string
 *   description: string
 *   content: string
 *   category: 'Strategy' | 'Preview' | 'Analysis'
 *   author: string
 *   image_url?: string
 *   is_published?: boolean (default: false)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Get the authorization token from the header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing or invalid token' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    // Extract user ID from token
    const userId = extractUserIdFromToken(token);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Check admin role using service role key (bypasses RLS)
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (profileError || !profile || profile.role !== 1) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      description,
      content,
      category,
      author,
      image_url,
      is_published = false,
    } = body;

    // Validate required fields
    if (!title || !description || !content || !category || !author) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, content, category, author' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('blogs')
      .insert([
        {
          title,
          description,
          content,
          category,
          author,
          image_url: image_url || null,
          views: 0,
          is_published,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ blog: data }, { status: 201 });
  } catch (err) {
    console.error('Error creating blog:', err);
    return NextResponse.json(
      { error: 'Failed to create blog' },
      { status: 500 }
    ); 
  }
}
