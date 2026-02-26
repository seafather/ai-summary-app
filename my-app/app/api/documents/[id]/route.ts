import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getOrCreateUser } from '@/lib/utils/user';

export const runtime = 'nodejs';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
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

    // Fetch document
    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (error || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Update last accessed time
    await supabaseAdmin
      .from('documents')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', id);

    // Get signed URL for file download
    const { data: urlData } = await supabaseAdmin
      .storage
      .from('documents')
      .createSignedUrl(document.storage_path, 3600); // 1 hour expiry

    return NextResponse.json({
      success: true,
      document: {
        ...document,
        signed_url: urlData?.signedUrl
      }
    });

  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    
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

    // Fetch document to verify ownership
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete file from Supabase Storage
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Soft delete in database
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
