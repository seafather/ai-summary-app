import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getOrCreateUser } from '@/lib/utils/user';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                     file.name.toLowerCase().endsWith('.txt') ? 'txt' : null;

    if (!fileType) {
      return NextResponse.json(
        { error: 'Only PDF and TXT files are supported' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const storedFilename = `${timestamp}-${randomString}-${file.name}`;
    const storagePath = `${user.id}/${storedFilename}`;

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Extract text content for TXT files
    let extractedText: string | undefined;
    let textCharCount: number | undefined;

    if (fileType === 'txt') {
      extractedText = await file.text();
      textCharCount = extractedText.length;
    }

    // Save document metadata to database
    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: user.id,
        original_filename: file.name,
        stored_filename: storedFilename,
        file_type: fileType,
        file_size_bytes: file.size,
        storage_bucket: 'documents',
        storage_path: storagePath,
        extracted_text: extractedText,
        text_char_count: textCharCount,
        mime_type: file.type,
        upload_ip_address: request.headers.get('x-forwarded-for') || 
                          request.headers.get('x-real-ip')
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      
      // Clean up uploaded file if database insert fails
      await supabaseAdmin.storage.from('documents').remove([storagePath]);
      
      return NextResponse.json(
        { error: 'Failed to save document metadata' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      document
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
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

    // Fetch user's documents
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documents
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
