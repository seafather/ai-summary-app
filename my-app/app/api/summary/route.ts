import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getOrCreateUser } from '@/lib/utils/user';
import { extractText, truncateText } from '@/lib/utils/textExtraction';
import { generateSummary, SummaryOptions } from '@/lib/utils/aiSummary';
import { Language, SummaryStyle, SummaryMode, FileType } from '@/lib/types/database';

export const runtime = 'nodejs';

// UUID validation helper
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUUID(str: string): boolean {
  return typeof str === 'string' && UUID_REGEX.test(str);
}
export const maxDuration = 60; // Allow up to 60 seconds for AI generation

/**
 * POST /api/summary - Generate a new summary for a document
 */
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

    // Parse request body
    const body = await request.json();
    const { 
      documentId, 
      language = 'English', 
      style = 'standard',
      summaryMode,
      pageRange,
      maxBulletPoints,
      customInstructions,
      forceRegenerate,
    } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    if (!isValidUUID(documentId)) {
      return NextResponse.json(
        { error: 'Invalid document ID format' },
        { status: 400 }
      );
    }

    // Validate language and style
    const validLanguages: Language[] = ['English', 'Chinese-Traditional', 'Chinese-Simplified', 'Japanese', 'Spanish', 'French', 'German'];
    const validStyles: SummaryStyle[] = ['standard', 'bullet-points', 'vivid-emoji'];

    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: 'Invalid language option' },
        { status: 400 }
      );
    }

    if (!validStyles.includes(style)) {
      return NextResponse.json(
        { error: 'Invalid style option' },
        { status: 400 }
      );
    }

    // Fetch document from database
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const fileType: FileType = document.file_type as FileType;

    // Determine summary mode
    const validPdfModes: SummaryMode[] = ['full-summary', 'chapter-outline', 'page-range'];
    const validTxtModes: SummaryMode[] = ['semantic-topics', 'meeting-minutes'];

    let resolvedMode: SummaryMode;
    if (summaryMode) {
      resolvedMode = summaryMode;
      if (fileType === 'pdf' && !validPdfModes.includes(resolvedMode)) {
        return NextResponse.json(
          { error: `Invalid summary mode for PDF. Valid: ${validPdfModes.join(', ')}` },
          { status: 400 }
        );
      }
      if (fileType === 'txt' && !validTxtModes.includes(resolvedMode)) {
        return NextResponse.json(
          { error: `Invalid summary mode for TXT. Valid: ${validTxtModes.join(', ')}` },
          { status: 400 }
        );
      }
    } else {
      resolvedMode = fileType === 'pdf' ? 'full-summary' : 'semantic-topics';
    }

    if (resolvedMode === 'page-range') {
      if (!pageRange || typeof pageRange.from !== 'number' || typeof pageRange.to !== 'number') {
        return NextResponse.json(
          { error: 'Page range (from, to) is required for page-range mode' },
          { status: 400 }
        );
      }
    }

    // Check if we already have extracted text
    let documentText = document.extracted_text;

    // If not, extract text from the file
    if (!documentText) {
      // Download file from storage
      const { data: fileData, error: downloadError } = await supabaseAdmin
        .storage
        .from(document.storage_bucket)
        .download(document.storage_path);

      if (downloadError || !fileData) {
        return NextResponse.json(
          { error: 'Failed to download document' },
          { status: 500 }
        );
      }

      // Extract text
      const buffer = Buffer.from(await fileData.arrayBuffer());
      documentText = await extractText(buffer, fileType);

      // Save extracted text to database for future use
      await supabaseAdmin
        .from('documents')
        .update({
          extracted_text: documentText,
          text_char_count: documentText.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
    }

    // Truncate if necessary
    documentText = truncateText(documentText);

    if (!documentText || documentText.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document appears to be empty or could not be read' },
        { status: 400 }
      );
    }

    // Check for existing summary with same parameters (cache hit)
    if (!forceRegenerate) {
      const { data: existingSummary } = await supabaseAdmin
        .from('summaries')
        .select('*')
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .eq('language', language)
        .eq('style', resolvedMode)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingSummary) {
        return NextResponse.json({ summary: existingSummary, cached: true });
      }
    }

    // Generate new summary using AI
    const summaryOptions: SummaryOptions = {
      language,
      style,
      fileType,
      summaryMode: resolvedMode,
      pageRange: resolvedMode === 'page-range' ? pageRange : undefined,
      maxBulletPoints: style === 'bullet-points' ? (maxBulletPoints || 4) : undefined,
      customInstructions,
    };

    const result = await generateSummary(documentText, summaryOptions);

    // Save summary to database (content is clean Markdown)
    const { data: newSummary, error: insertError } = await supabaseAdmin
      .from('summaries')
      .insert({
        document_id: documentId,
        user_id: user.id,
        summary_content: result.content,
        summary_length: result.content.length,
        model_used: 'gpt-4o-mini',
        language,
        style: resolvedMode,
        max_bullet_points: maxBulletPoints,
        custom_instructions: customInstructions,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        total_tokens: result.totalTokens,
        generation_status: 'completed'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to save summary:', insertError);
      return NextResponse.json({
        summary: {
          summary_content: result.content,
          language,
          style: resolvedMode,
          model_used: 'gpt-4o-mini',
          created_at: new Date().toISOString()
        },
        cached: false,
        saveError: true
      });
    }

    return NextResponse.json({ summary: newSummary, cached: false });

  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
