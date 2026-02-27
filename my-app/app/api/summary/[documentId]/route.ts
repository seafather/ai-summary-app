import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getOrCreateUser } from '@/lib/utils/user';

export const runtime = 'nodejs';

interface RouteParams {
  params: Promise<{
    documentId: string;
  }>;
}

/**
 * GET /api/summary/[documentId] - Get existing summary for a document
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { documentId } = await params;
    
    // Get user key from header
    const userKey = request.headers.get('x-user-key');
    
    if (!userKey) {
      return NextResponse.json(
        { error: 'Missing user key in request header' },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await getOrCreateUser(userKey);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 401 }
      );
    }

    // Fetch most recent summary for this document
    const { data: summary, error } = await supabaseAdmin
      .from('summaries')
      .select('*')
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No summary found is not an error, just return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({ summary: null });
      }
      throw error;
    }

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('Get summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch summary' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/summary/[documentId] - Update/edit a summary
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { documentId } = await params;
    
    // Get user key from header
    const userKey = request.headers.get('x-user-key');
    
    if (!userKey) {
      return NextResponse.json(
        { error: 'Missing user key in request header' },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await getOrCreateUser(userKey);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { summaryId, content } = body;

    if (!summaryId || !content) {
      return NextResponse.json(
        { error: 'Summary ID and content are required' },
        { status: 400 }
      );
    }

    // Verify the summary belongs to this user and document
    const { data: existingSummary, error: fetchError } = await supabaseAdmin
      .from('summaries')
      .select('*')
      .eq('id', summaryId)
      .eq('document_id', documentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingSummary) {
      return NextResponse.json(
        { error: 'Summary not found' },
        { status: 404 }
      );
    }

    // Update the summary
    const updateData: Record<string, unknown> = {
      summary_content: content,
      summary_length: content.length,
      is_edited: true,
      edit_count: (existingSummary.edit_count || 0) + 1,
      last_edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store original if this is the first edit
    if (!existingSummary.is_edited) {
      updateData.original_summary_content = existingSummary.summary_content;
    }

    const { data: updatedSummary, error: updateError } = await supabaseAdmin
      .from('summaries')
      .update(updateData)
      .eq('id', summaryId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ summary: updatedSummary });

  } catch (error) {
    console.error('Update summary error:', error);
    return NextResponse.json(
      { error: 'Failed to update summary' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/summary/[documentId] - Delete a summary
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { documentId } = await params;
    
    // Get user key from header
    const userKey = request.headers.get('x-user-key');
    
    if (!userKey) {
      return NextResponse.json(
        { error: 'Missing user key in request header' },
        { status: 400 }
      );
    }

    // Get or create user
    const user = await getOrCreateUser(userKey);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to authenticate user' },
        { status: 401 }
      );
    }

    // Parse request body for summary ID
    const url = new URL(request.url);
    const summaryId = url.searchParams.get('summaryId');

    if (!summaryId) {
      return NextResponse.json(
        { error: 'Summary ID is required' },
        { status: 400 }
      );
    }

    // Soft delete the summary
    const { error } = await supabaseAdmin
      .from('summaries')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', summaryId)
      .eq('document_id', documentId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Delete summary error:', error);
    return NextResponse.json(
      { error: 'Failed to delete summary' },
      { status: 500 }
    );
  }
}
