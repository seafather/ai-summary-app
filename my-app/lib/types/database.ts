export interface User {
  id: string;
  user_key: string;
  user_key_hash: string;
  display_name?: string;
  default_language: string;
  default_style: string;
  created_at: string;
  updated_at: string;
  last_access_at?: string;
  is_active: boolean;
}

export interface Document {
  id: string;
  user_id: string;
  original_filename: string;
  stored_filename: string;
  file_type: 'pdf' | 'txt';
  file_size_bytes: number;
  storage_bucket: string;
  storage_path: string;
  extracted_text?: string;
  text_char_count?: number;
  mime_type?: string;
  upload_ip_address?: string;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  is_deleted: boolean;
  deleted_at?: string;
}

export interface Summary {
  id: string;
  document_id: string;
  user_id: string;
  summary_content: string;
  summary_length?: number;
  model_used: string;
  language: string;
  style: string;
  max_bullet_points?: number;
  custom_instructions?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  is_edited: boolean;
  original_summary_content?: string;
  edit_count: number;
  created_at: string;
  updated_at: string;
  last_edited_at?: string;
  is_active: boolean;
  generation_status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
}

export type FileType = 'pdf' | 'txt';
export type Language = 'English' | 'Chinese-Traditional' | 'Chinese-Simplified' | 'Japanese' | 'Spanish' | 'French' | 'German';
export type SummaryStyle = 'standard' | 'bullet-points' | 'vivid-emoji';

/**
 * Summary modes tailored to file types.
 * PDF modes leverage page/chapter structure; TXT modes leverage semantic analysis.
 */
export type PdfSummaryMode = 'full-summary' | 'chapter-outline' | 'page-range';
export type TxtSummaryMode = 'semantic-topics' | 'meeting-minutes';
export type SummaryMode = PdfSummaryMode | TxtSummaryMode;
