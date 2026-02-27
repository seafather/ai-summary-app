import { Language, SummaryStyle, SummaryMode, FileType } from '@/lib/types/database';

export interface SummaryOptions {
  language: Language;
  style: SummaryStyle;
  fileType: FileType;
  summaryMode: SummaryMode;
  /** For PDF page-range mode only */
  pageRange?: { from: number; to: number };
  maxBulletPoints?: number;
  customInstructions?: string;
}

export interface SummaryResult {
  content: string;   // Markdown string stored in DB
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/* ------------------------------------------------------------------ */
/*  Language Rules                                                      */
/* ------------------------------------------------------------------ */

function getLanguageRules(language: Language): string {
  const languageRules: Record<Language, string> = {
    'English': `- Output language: English.
- For technical terms or proper nouns that originate from another language, keep the original form in parentheses. Example: "Machine Learning (ML)".`,
    'Chinese-Traditional': `- 輸出語言：繁體中文。
- 若遇到專有名詞或技術術語，請先使用繁體中文翻譯，並在後方括號附上英文原文。例如：「機器學習 (Machine Learning)」。
- 數字與英文縮寫保留原樣，例如「API」、「HTTP」、「GPT-4」。`,
    'Chinese-Simplified': `- 输出语言：简体中文。
- 若遇到专有名词或技术术语，请先使用简体中文翻译，并在后方括号附上英文原文。例如：「机器学习 (Machine Learning)」。
- 数字与英文缩写保留原样，例如「API」、「HTTP」、「GPT-4」。`,
    'Japanese': `- 出力言語：日本語。
- 専門用語や固有名詞は、まず日本語で表記し、括弧内に英語の原語を付記してください。例：「機械学習 (Machine Learning)」。`,
    'Spanish': `- Idioma de salida: español.
- Para términos técnicos, use la traducción al español seguida del término original en inglés entre paréntesis. Ejemplo: "Aprendizaje automático (Machine Learning)".`,
    'French': `- Langue de sortie : français.
- Pour les termes techniques, utilisez la traduction française suivie du terme original anglais entre parenthèses. Exemple : « Apprentissage automatique (Machine Learning) ».`,
    'German': `- Ausgabesprache: Deutsch.
- Für Fachbegriffe verwenden Sie die deutsche Übersetzung, gefolgt vom englischen Originalbegriff in Klammern. Beispiel: „Maschinelles Lernen (Machine Learning)".`,
  };
  return languageRules[language];
}

/* ------------------------------------------------------------------ */
/*  Style Instructions                                                  */
/* ------------------------------------------------------------------ */

function getStyleInstructions(style: SummaryStyle, maxBulletPoints?: number): string {
  const styleInstructions: Record<SummaryStyle, string> = {
    'standard':
      'Write in a clear, professional tone with well-structured paragraphs. Focus on the main ideas and key information.',
    'bullet-points':
      `Create concise bullet-point summaries. ${maxBulletPoints ? `Use at most ${maxBulletPoints} bullet points per section.` : 'Use 4-6 bullet points per section.'} Each bullet should capture one key point.`,
    'vivid-emoji':
      'Write in an engaging, vivid tone with emojis. Use a friendly, energetic voice while maintaining accuracy. Include relevant emojis to highlight key points.',
  };
  return styleInstructions[style];
}

/* ------------------------------------------------------------------ */
/*  Mode-Specific Prompt Builders                                       */
/* ------------------------------------------------------------------ */

/** PDF: Full Summary */
function buildPdfFullSummaryPrompt(options: SummaryOptions): string {
  return `You are a professional document summarizer and analyst.

### YOUR TASK
Read the provided **PDF document** and produce a comprehensive summary in **Markdown** format.

### LANGUAGE RULES
${getLanguageRules(options.language)}

### STYLE
${getStyleInstructions(options.style, options.maxBulletPoints)}

### OUTPUT FORMAT
Return **only** well-formatted Markdown. Structure your output as follows:

## Executive Summary
A concise 2-3 sentence overview of the entire document.

## Key Findings
The most important points, insights, or arguments from the document.

## Key Terms
Important terms or concepts mentioned in the document, each with a brief definition.

## Related Questions
3-5 follow-up questions a reader might ask after reading the document.

### ADDITIONAL GUIDELINES
- Extract and present the most important information.
- Maintain accuracy — never fabricate information not in the document.
- If page numbers are discernible, reference them naturally (e.g., "As discussed on page 5...").
- Adapt summary length to the document: short documents get shorter summaries.
${options.customInstructions ? `\n### USER CUSTOM INSTRUCTIONS\n${options.customInstructions}` : ''}`;
}

/** PDF: Chapter / Outline */
function buildPdfChapterOutlinePrompt(options: SummaryOptions): string {
  return `You are a professional document summarizer and analyst.

### YOUR TASK
Read the provided **PDF document** and break it down **chapter by chapter** (or section by section). Identify headings, visual breaks, or topic shifts to determine chapters. For each chapter/section, provide a summary.

### LANGUAGE RULES
${getLanguageRules(options.language)}

### STYLE
${getStyleInstructions(options.style, options.maxBulletPoints)}

### OUTPUT FORMAT
Return **only** well-formatted Markdown. Use this structure:

## Document Overview
A brief 1-2 sentence overview of the entire document.

## Chapter / Section Breakdown

### [Chapter/Section Title or Topic 1]
**Pages:** [page range if detectable, e.g., "pp. 1-5", or "N/A"]
[Summary of this chapter/section]

### [Chapter/Section Title or Topic 2]
**Pages:** [page range if detectable]
[Summary of this chapter/section]

_(Continue for each detected chapter/section)_

## Key Terms
Important terms or concepts, each with a brief definition.

### ADDITIONAL GUIDELINES
- Detect chapter boundaries from headings, large font text, page breaks, or topic shifts.
- If the PDF has no clear chapter structure, divide by major topic shifts.
- Reference page numbers where possible.
- Maintain accuracy — never fabricate information not in the document.
${options.customInstructions ? `\n### USER CUSTOM INSTRUCTIONS\n${options.customInstructions}` : ''}`;
}

/** PDF: Page Range */
function buildPdfPageRangePrompt(options: SummaryOptions): string {
  const from = options.pageRange?.from ?? 1;
  const to = options.pageRange?.to ?? 'end';
  return `You are a professional document summarizer and analyst.

### YOUR TASK
Read the provided **PDF document** and summarize **ONLY the content from page ${from} to page ${to}**. Ignore content outside this range.

### LANGUAGE RULES
${getLanguageRules(options.language)}

### STYLE
${getStyleInstructions(options.style, options.maxBulletPoints)}

### OUTPUT FORMAT
Return **only** well-formatted Markdown:

## Summary (Pages ${from}–${to})
[Comprehensive summary of the specified page range]

## Key Points
The most important findings or arguments from this specific section.

## Key Terms
Important terms appearing in this page range, each with a brief definition.

### ADDITIONAL GUIDELINES
- Focus exclusively on content within the specified page range.
- Reference page numbers naturally where possible.
- Maintain accuracy — never fabricate information.
${options.customInstructions ? `\n### USER CUSTOM INSTRUCTIONS\n${options.customInstructions}` : ''}`;
}

/** TXT: Semantic Topics */
function buildTxtSemanticTopicsPrompt(options: SummaryOptions): string {
  return `You are a professional document summarizer and analyst.

### YOUR TASK
Read the provided **plain text document** and identify the **core topics or themes**. Organise your summary by these topics. This text has no pages or chapters — you must use semantic analysis to determine logical groupings.

### LANGUAGE RULES
${getLanguageRules(options.language)}

### STYLE
${getStyleInstructions(options.style, options.maxBulletPoints)}

### OUTPUT FORMAT
Return **only** well-formatted Markdown:

## Executive Summary
A concise 2-3 sentence overview of the entire text.

## Topic Analysis

### [Topic 1 Title]
[Summary of this topic / theme]

### [Topic 2 Title]
[Summary of this topic / theme]

_(Continue for each identified topic — aim for 3-6 topics)_

## Key Terms
Important terms or concepts mentioned in the text, each with a brief definition.

## Related Questions
3-5 follow-up questions a reader might ask.

### ADDITIONAL GUIDELINES
- Identify natural topics from the content — do NOT fabricate topics.
- Group related paragraphs that discuss the same theme.
- Maintain accuracy — never add information not in the original text.
- Adapt the number of topics to the text length: short texts may have 2-3 topics, long texts up to 6.
${options.customInstructions ? `\n### USER CUSTOM INSTRUCTIONS\n${options.customInstructions}` : ''}`;
}

/** TXT: Meeting Minutes / Action Items */
function buildTxtMeetingMinutesPrompt(options: SummaryOptions): string {
  return `You are a professional meeting notes analyst and summarizer.

### YOUR TASK
Read the provided **plain text** and treat it as a meeting transcript, discussion log, or conversation record. Extract structured information including decisions, action items, and key discussion points.

### LANGUAGE RULES
${getLanguageRules(options.language)}

### STYLE
${getStyleInstructions(options.style, options.maxBulletPoints)}

### OUTPUT FORMAT
Return **only** well-formatted Markdown:

## Meeting Overview
A brief summary of what the meeting / discussion was about, including participants if identifiable.

## Key Decisions
Bullet list of decisions made during the meeting / discussion.
- [Decision 1]
- [Decision 2]

## Action Items
Tasks or follow-ups that were assigned or mentioned.
- [ ] [Action item 1] — *Owner (if identifiable)*
- [ ] [Action item 2] — *Owner (if identifiable)*

## Discussion Highlights
The most important topics discussed, with brief summaries for each.

### [Discussion Point 1]
[Summary]

### [Discussion Point 2]
[Summary]

## Open Questions / Unresolved Issues
Any questions or issues that were raised but not resolved.

### ADDITIONAL GUIDELINES
- If the text is clearly NOT a meeting or conversation, still extract the most relevant structured information using the same format but adapt section titles accordingly (e.g., "Key Findings" instead of "Key Decisions").
- Identify speakers/participants if the text contains names or speaker labels.
- Maintain accuracy — never fabricate information not present in the text.
${options.customInstructions ? `\n### USER CUSTOM INSTRUCTIONS\n${options.customInstructions}` : ''}`;
}

/* ------------------------------------------------------------------ */
/*  Prompt Router                                                       */
/* ------------------------------------------------------------------ */

function buildSystemPrompt(options: SummaryOptions): string {
  switch (options.summaryMode) {
    case 'full-summary':
      return buildPdfFullSummaryPrompt(options);
    case 'chapter-outline':
      return buildPdfChapterOutlinePrompt(options);
    case 'page-range':
      return buildPdfPageRangePrompt(options);
    case 'semantic-topics':
      return buildTxtSemanticTopicsPrompt(options);
    case 'meeting-minutes':
      return buildTxtMeetingMinutesPrompt(options);
    default:
      return buildPdfFullSummaryPrompt(options);
  }
}

/* ------------------------------------------------------------------ */
/*  Token Management                                                    */
/* ------------------------------------------------------------------ */

/**
 * Rough token estimation: ~4 chars per token for English,
 * ~1.5 chars per token for CJK characters.
 */
function estimateTokens(text: string): number {
  // Count CJK characters (they use more tokens per character)
  const cjkCount = (text.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const nonCjkLength = text.length - cjkCount;
  return Math.ceil(nonCjkLength / 4 + cjkCount / 1.5);
}

/**
 * Truncate document text to fit within the model's token budget.
 * gpt-4o-mini on GitHub Models has an 8000-token input limit.
 * We reserve tokens for the system prompt, message wrapper, and output.
 */
function truncateToTokenBudget(
  documentText: string,
  systemPrompt: string,
  maxInputTokens = 8000,
  maxOutputTokens = 3000
): { text: string; wasTruncated: boolean } {
  const systemTokens = estimateTokens(systemPrompt);
  const wrapperOverhead = 150; // tokens for message wrappers, separators, etc.
  const availableForDoc = maxInputTokens - maxOutputTokens - systemTokens - wrapperOverhead;

  // Ensure we have at least some budget for the document
  const budget = Math.max(availableForDoc, 1500);
  const docTokens = estimateTokens(documentText);

  if (docTokens <= budget) {
    return { text: documentText, wasTruncated: false };
  }

  // Truncate: approximate the character count for the budget
  const cjkCount = (documentText.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const cjkRatio = cjkCount / Math.max(documentText.length, 1);
  const charsPerToken = cjkRatio > 0.3 ? 1.5 : 4;
  const maxChars = Math.floor(budget * charsPerToken);

  const truncated = documentText.slice(0, maxChars);
  // Try to cut at a sentence or paragraph boundary
  const lastBreak = Math.max(
    truncated.lastIndexOf('\n\n'),
    truncated.lastIndexOf('. '),
    truncated.lastIndexOf('。')
  );
  const cleanCut = lastBreak > maxChars * 0.7 ? truncated.slice(0, lastBreak + 1) : truncated;

  return {
    text: cleanCut + '\n\n[... Document truncated due to length limits ...]',
    wasTruncated: true,
  };
}

/* ------------------------------------------------------------------ */
/*  Main Generation Function                                           */
/* ------------------------------------------------------------------ */

/**
 * Generate a summary using GitHub Models API (GPT-4o-mini).
 * Returns clean Markdown — no JSON wrapping.
 */
export async function generateSummary(
  documentText: string,
  options: SummaryOptions
): Promise<SummaryResult> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  const systemPrompt = buildSystemPrompt(options);

  // Truncate document text if it exceeds the model's token budget
  const { text: trimmedText, wasTruncated } = truncateToTokenBudget(documentText, systemPrompt);

  const truncationNote = wasTruncated
    ? ' Note: The document was too long and has been truncated. Summarize the available content and mention that the document was partially processed.'
    : '';

  const userMessage = options.summaryMode === 'page-range'
    ? `Please summarize the following document content (pages ${options.pageRange?.from ?? 1} to ${options.pageRange?.to ?? 'end'}). Return only Markdown.${truncationNote}\n\n---\n${trimmedText}\n---`
    : `Please analyze and summarize the following document. Return only Markdown.${truncationNote}\n\n---\n${trimmedText}\n---`;

  try {
    const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 3000,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('GitHub Models API HTTP error:', response.status, errBody);
      throw new Error(`API returned ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content ?? '';
    const usage = data.usage;

    // Remove markdown code fences if AI accidentally wraps response
    let cleanContent = text.trim();
    if (cleanContent.startsWith('```markdown')) {
      cleanContent = cleanContent.slice('```markdown'.length);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    return {
      content: cleanContent,
      inputTokens: usage?.prompt_tokens,
      outputTokens: usage?.completion_tokens,
      totalTokens: usage?.total_tokens,
    };
  } catch (error) {
    console.error('GitHub Models API error:', error);
    throw new Error('Failed to generate summary. Please try again.');
  }
}
