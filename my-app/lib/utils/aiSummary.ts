import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { Language, SummaryStyle } from '@/lib/types/database';

// Initialize GitHub Models client
const github = createOpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.GITHUB_TOKEN || '',
});

export interface SummaryOptions {
  language: Language;
  style: SummaryStyle;
  maxBulletPoints?: number;
  customInstructions?: string;
}

export interface SummaryResult {
  content: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

/**
 * Build the system prompt based on user preferences
 */
function buildSystemPrompt(options: SummaryOptions): string {
  const languageInstructions: Record<Language, string> = {
    'English': 'Respond in English.',
    'Chinese-Traditional': '請使用繁體中文回覆。',
    'Chinese-Simplified': '请使用简体中文回复。',
    'Japanese': '日本語で回答してください。',
    'Spanish': 'Responda en español.',
    'French': 'Répondez en français.',
    'German': 'Antworten Sie auf Deutsch.',
  };

  const styleInstructions: Record<SummaryStyle, string> = {
    'standard': 'Write a clear, professional summary with proper paragraphs. Focus on the main ideas and key information.',
    'bullet-points': `Create a concise bullet-point summary. ${options.maxBulletPoints ? `Limit to ${options.maxBulletPoints} bullet points maximum.` : 'Use 4-6 bullet points.'} Each bullet should capture a key point.`,
    'vivid-emoji': 'Write an engaging, vivid summary with emojis 🎯. Use a friendly, energetic tone while maintaining accuracy. Include relevant emojis to highlight key points 📌✨.',
  };

  let prompt = `You are a professional document summarizer. Your task is to read the provided document and create a high-quality summary.

${languageInstructions[options.language]}

${styleInstructions[options.style]}

Guidelines:
- Extract and present the most important information
- Maintain accuracy and don't add information not in the document
- Use Markdown formatting for better readability
- If the document is very short, adapt your summary length accordingly`;

  if (options.customInstructions) {
    prompt += `\n\nAdditional user instructions: ${options.customInstructions}`;
  }

  return prompt;
}

/**
 * Generate a summary using GitHub Models API (GPT-4o-mini)
 */
export async function generateSummary(
  documentText: string,
  options: SummaryOptions
): Promise<SummaryResult> {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable is not set');
  }

  const systemPrompt = buildSystemPrompt(options);

  try {
    const result = await generateText({
      model: github('gpt-4o-mini'),
      system: systemPrompt,
      prompt: `Please summarize the following document:\n\n---\n${documentText}\n---`,
      maxOutputTokens: 2000,
      temperature: 0.7,
    });

    return {
      content: result.text,
      inputTokens: result.usage?.inputTokens,
      outputTokens: result.usage?.outputTokens,
      totalTokens: (result.usage?.inputTokens || 0) + (result.usage?.outputTokens || 0),
    };
  } catch (error) {
    console.error('GitHub Models API error:', error);
    throw new Error('Failed to generate summary. Please try again.');
  }
}
