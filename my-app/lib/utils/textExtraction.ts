/**
 * Extract text from a PDF file buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse v2 exports a PDFParse class, not a default function
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text.trim();
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from a TXT file buffer
 */
export function extractTextFromTXT(buffer: Buffer): string {
  try {
    // Try UTF-8 first
    let text = buffer.toString('utf-8');
    
    // Check for BOM and remove it
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    
    return text.trim();
  } catch (error) {
    console.error('TXT text extraction error:', error);
    throw new Error('Failed to extract text from TXT file');
  }
}

/**
 * Extract text from a file based on its type
 */
export async function extractText(buffer: Buffer, fileType: 'pdf' | 'txt'): Promise<string> {
  if (fileType === 'pdf') {
    return extractTextFromPDF(buffer);
  } else if (fileType === 'txt') {
    return extractTextFromTXT(buffer);
  }
  throw new Error(`Unsupported file type: ${fileType}`);
}

/**
 * Truncate text to fit within token limits (rough estimate: 1 token ≈ 4 chars)
 * GitHub Models has context limits, so we need to truncate large documents
 */
export function truncateText(text: string, maxTokens: number = 100000): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  
  // Truncate and add notice
  return text.slice(0, maxChars) + '\n\n[Document truncated due to length...]';
}
