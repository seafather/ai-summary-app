-- ============================================
-- Supabase Database Setup Script
-- AI Document Summarization Application
-- ============================================

-- Step 1: Create users table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User-Provided Identifier (No Authentication)
    user_key VARCHAR(255) UNIQUE NOT NULL,
    user_key_hash VARCHAR(64) UNIQUE NOT NULL,
    
    -- Profile Information (Optional)
    display_name VARCHAR(100),
    
    -- Preferences
    default_language VARCHAR(20) DEFAULT 'English',
    default_style VARCHAR(50) DEFAULT 'standard',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_access_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT user_key_length CHECK (LENGTH(user_key) >= 8 AND LENGTH(user_key) <= 255)
);

-- Step 2: Create documents table
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) UNIQUE NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    
    -- Storage Reference
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'documents',
    storage_path TEXT NOT NULL,
    
    -- Content Information
    extracted_text TEXT,
    text_char_count INTEGER,
    
    -- Metadata
    mime_type VARCHAR(100),
    upload_ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_file_type CHECK (file_type IN ('pdf', 'txt')),
    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),
    CONSTRAINT unique_storage_path UNIQUE (storage_bucket, storage_path)
);

-- Step 3: Create summaries table
-- ============================================
CREATE TABLE IF NOT EXISTS summaries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Summary Content
    summary_content TEXT NOT NULL,
    summary_length INTEGER,
    
    -- Generation Parameters
    model_used VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
    language VARCHAR(20) NOT NULL,
    style VARCHAR(50) NOT NULL,
    max_bullet_points INTEGER,
    custom_instructions TEXT,
    
    -- Token Usage (for cost tracking)
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Edit Tracking
    is_edited BOOLEAN DEFAULT FALSE,
    original_summary_content TEXT,
    edit_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    generation_status VARCHAR(20) DEFAULT 'completed',
    error_message TEXT,
    
    -- Constraints
    CONSTRAINT valid_language CHECK (language IN ('English', 'Chinese-Traditional', 'Chinese-Simplified', 'Japanese', 'Spanish', 'French', 'German')),
    CONSTRAINT valid_status CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT valid_model CHECK (model_used IN ('gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'))
);

-- Step 4: Create optional tables
-- ============================================

-- Summary view history (analytics)
CREATE TABLE IF NOT EXISTS summary_view_history (
    id BIGSERIAL PRIMARY KEY,
    summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration_seconds INTEGER,
    device_type VARCHAR(50),
    browser VARCHAR(100),
    ip_address INET
);

-- API usage logs (cost tracking)
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    summary_id UUID REFERENCES summaries(id) ON DELETE SET NULL,
    model_name VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    response_time_ms INTEGER,
    status_code INTEGER,
    is_successful BOOLEAN,
    error_type VARCHAR(100),
    error_message TEXT,
    called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create indexes
-- ============================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_user_key_hash ON users(user_key_hash);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_access ON users(last_access_at DESC);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_is_deleted ON documents(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_documents_user_active ON documents(user_id, is_deleted) WHERE is_deleted = FALSE;

-- Summaries table indexes
CREATE INDEX IF NOT EXISTS idx_summaries_document_id ON summaries(document_id);
CREATE INDEX IF NOT EXISTS idx_summaries_user_id ON summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_summaries_is_active ON summaries(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_summaries_cache_lookup ON summaries(document_id, language, style, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_summaries_status ON summaries(generation_status) WHERE generation_status != 'completed';

-- View history indexes
CREATE INDEX IF NOT EXISTS idx_view_history_summary_id ON summary_view_history(summary_id);
CREATE INDEX IF NOT EXISTS idx_view_history_user_id ON summary_view_history(user_id);
CREATE INDEX IF NOT EXISTS idx_view_history_viewed_at ON summary_view_history(viewed_at DESC);

-- API logs indexes
CREATE INDEX IF NOT EXISTS idx_api_logs_called_at ON api_usage_logs(called_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_is_successful ON api_usage_logs(is_successful);

-- Step 6: Create triggers and functions
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to documents table
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to summaries table
DROP TRIGGER IF EXISTS update_summaries_updated_at ON summaries;
CREATE TRIGGER update_summaries_updated_at
    BEFORE UPDATE ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to track summary edits
CREATE OR REPLACE FUNCTION track_summary_edit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.summary_content IS DISTINCT FROM OLD.summary_content AND OLD.created_at IS NOT NULL THEN
        IF NOT OLD.is_edited THEN
            NEW.is_edited = TRUE;
            NEW.original_summary_content = OLD.summary_content;
        END IF;
        NEW.edit_count = OLD.edit_count + 1;
        NEW.last_edited_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_summary_edits ON summaries;
CREATE TRIGGER track_summary_edits
    BEFORE UPDATE ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION track_summary_edit();

-- Function for soft delete
CREATE OR REPLACE FUNCTION soft_delete_document()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        NEW.deleted_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_document_soft_delete ON documents;
CREATE TRIGGER handle_document_soft_delete
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete_document();

-- Step 7: Enable Row Level Security
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_view_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS Policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS users_service_role ON users;
DROP POLICY IF EXISTS documents_service_role ON documents;
DROP POLICY IF EXISTS summaries_service_role ON summaries;
DROP POLICY IF EXISTS view_history_service_role ON summary_view_history;
DROP POLICY IF EXISTS api_logs_service_role ON api_usage_logs;

-- Service role policies (full access for backend)
CREATE POLICY users_service_role
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY documents_service_role
    ON documents FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY summaries_service_role
    ON summaries FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY view_history_service_role
    ON summary_view_history FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY api_logs_service_role
    ON api_usage_logs FOR ALL
    USING (true)
    WITH CHECK (true);

-- ============================================
-- Setup Complete!
-- ============================================

-- Verify setup
SELECT 'Tables created successfully!' AS status;

-- Show all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
