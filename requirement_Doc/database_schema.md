# PostgreSQL Database Schema Design

## Overview
This database schema is designed for an AI-powered document summarization application that supports file upload, AI summary generation, and intelligent caching mechanisms using Supabase PostgreSQL.

---

## Database Entity Relationship Diagram (ERD)

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   users     │1       N│  documents   │1       N│  summaries   │
│             ├─────────┤              ├─────────┤              │
│  (Auth)     │         │  (Files)     │         │  (Cache)     │
└─────────────┘         └──────────────┘         └──────────────┘
```

---

## Table Structures

### 1. `users` Table
**Purpose:** Store user sessions and preferences based on user-provided unique identifiers. No authentication required - users provide their own unique string for data separation.

```sql
CREATE TABLE users (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User-Provided Identifier (No Authentication)
    user_key VARCHAR(255) UNIQUE NOT NULL, -- User provides this unique string
    user_key_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 hash for security
    
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

-- Indexes
CREATE INDEX idx_users_user_key_hash ON users(user_key_hash);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
CREATE INDEX idx_users_last_access ON users(last_access_at DESC);
```

**Explanation:**
- **id**: UUID primary key for internal references
- **user_key**: User-provided unique string (e.g., "myproject2024", "alice-workspace") - minimum 8 characters
- **user_key_hash**: SHA-256 hash of user_key for indexed lookups without exposing the actual key
- **default_language/style**: Store user preferences to pre-fill summary generation options
- **is_active**: Track active sessions or allow cleanup of abandoned user data
- **Timestamps**: Track session creation, updates, and last access

---

### 2. `documents` Table
**Purpose:** Store metadata about uploaded documents and their references to Supabase Storage.

```sql
CREATE TABLE documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) UNIQUE NOT NULL, -- UUID-based filename in Supabase Storage
    file_type VARCHAR(10) NOT NULL, -- only 'pdf' or 'txt'
    file_size_bytes BIGINT NOT NULL,
    
    -- Storage Reference
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'documents',
    storage_path TEXT NOT NULL, -- Full path in Supabase Storage
    
    -- Content Information
    extracted_text TEXT, -- Cached extracted text from the document
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
    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800), -- Max 50MB
    CONSTRAINT unique_storage_path UNIQUE (storage_bucket, storage_path)
);

-- Indexes
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_documents_is_deleted ON documents(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_documents_user_active ON documents(user_id, is_deleted) WHERE is_deleted = FALSE;
```

**Explanation:**
- **user_id**: Links document to the owner (CASCADE delete ensures cleanup when user is deleted)
- **original_filename**: The name user uploaded (for display purposes)
- **stored_filename**: UUID-based name to prevent conflicts in Supabase Storage
- **storage_path**: Full path reference for Supabase Storage API calls
- **extracted_text**: Cached text extraction to avoid re-processing
- **is_deleted**: Soft delete mechanism (retains data for potential recovery)
- **last_accessed_at**: Track document usage for analytics

---

### 3. `summaries` Table
**Purpose:** Cache AI-generated summaries with their generation parameters to avoid redundant API calls and preserve user edits.

```sql
CREATE TABLE summaries (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Summary Content
    summary_content TEXT NOT NULL,
    summary_length INTEGER, -- Character count
    
    -- Generation Parameters
    model_used VARCHAR(50) NOT NULL DEFAULT 'gpt-4o-mini',
    language VARCHAR(20) NOT NULL, -- 'English', 'Chinese-Traditional', 'Chinese-Simplified', 'Japanese'
    style VARCHAR(50) NOT NULL, -- 'standard', 'bullet-points', 'vivid-emoji', etc.
    max_bullet_points INTEGER, -- If style is bullet-points
    custom_instructions TEXT, -- Any additional user-specified instructions
    
    -- Token Usage (for cost tracking)
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Edit Tracking
    is_edited BOOLEAN DEFAULT FALSE, -- Has user manually edited the summary?
    original_summary_content TEXT, -- Store original AI output if edited
    edit_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_edited_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE, -- Allow multiple summaries, mark primary one
    generation_status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'
    error_message TEXT, -- Store error if generation failed
    
    -- Constraints
    CONSTRAINT valid_language CHECK (language IN ('English', 'Chinese-Traditional', 'Chinese-Simplified', 'Japanese', 'Spanish', 'French', 'German')),
    CONSTRAINT valid_status CHECK (generation_status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT valid_model CHECK (model_used IN ('gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'))
);

-- Indexes
CREATE INDEX idx_summaries_document_id ON summaries(document_id);
CREATE INDEX idx_summaries_user_id ON summaries(user_id);
CREATE INDEX idx_summaries_created_at ON summaries(created_at DESC);
CREATE INDEX idx_summaries_is_active ON summaries(is_active) WHERE is_active = TRUE;
-- Composite index for cache lookup
CREATE INDEX idx_summaries_cache_lookup ON summaries(document_id, language, style, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_summaries_status ON summaries(generation_status) WHERE generation_status != 'completed';
```

**Explanation:**
- **document_id**: Links summary to source document
- **user_id**: Track which user generated this summary
- **summary_content**: The actual AI-generated (or edited) summary
- **Generation Parameters**: Store all settings used to generate the summary for cache matching
- **is_edited**: Track if user modified the AI output (important for quality feedback)
- **original_summary_content**: Preserve AI output even after user edits
- **Token tracking**: Monitor API costs and usage patterns
- **is_active**: Support multiple summaries per document (different languages/styles)
- **Cache lookup index**: Optimize queries for "Does this document already have a summary with these parameters?"

---

### 4. `summary_view_history` Table (Optional)
**Purpose:** Track when users view summaries for analytics and behavior analysis.

```sql
CREATE TABLE summary_view_history (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Foreign Keys
    summary_id UUID NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    
    -- View Information
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration_seconds INTEGER, -- How long did user read the summary?
    
    -- Context
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100),
    ip_address INET
);

-- Indexes
CREATE INDEX idx_view_history_summary_id ON summary_view_history(summary_id);
CREATE INDEX idx_view_history_user_id ON summary_view_history(user_id);
CREATE INDEX idx_view_history_viewed_at ON summary_view_history(viewed_at DESC);
```

**Explanation:**
- Useful for understanding user engagement
- Can identify popular documents or summary styles
- Helps optimize AI parameters based on user behavior

---

### 5. `api_usage_logs` Table (Optional)
**Purpose:** Track AI API calls for cost management and debugging.

```sql
CREATE TABLE api_usage_logs (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Foreign Keys
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    summary_id UUID REFERENCES summaries(id) ON DELETE SET NULL,
    
    -- API Call Information
    model_name VARCHAR(50) NOT NULL,
    endpoint VARCHAR(255),
    
    -- Token Usage
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    
    -- Performance
    response_time_ms INTEGER,
    
    -- Status
    status_code INTEGER,
    is_successful BOOLEAN,
    error_type VARCHAR(100),
    error_message TEXT,
    
    -- Timestamps
    called_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_api_logs_called_at ON api_usage_logs(called_at DESC);
CREATE INDEX idx_api_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX idx_api_logs_is_successful ON api_usage_logs(is_successful);
```

**Explanation:**
- Monitor API costs in real-time
- Debug failed API calls
- Analyze performance trends

---

## Database Triggers and Functions

### 1. Auto-update `updated_at` Timestamp

```sql
-- Create reusable function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_summaries_updated_at
    BEFORE UPDATE ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2. Track Summary Edits

```sql
-- Automatically track when summary is edited
CREATE OR REPLACE FUNCTION track_summary_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- If summary_content changed and it's not the first save
    IF NEW.summary_content IS DISTINCT FROM OLD.summary_content AND OLD.created_at IS NOT NULL THEN
        -- Mark as edited if not already marked
        IF NOT OLD.is_edited THEN
            NEW.is_edited = TRUE;
            NEW.original_summary_content = OLD.summary_content;
        END IF;
        
        -- Increment edit count
        NEW.edit_count = OLD.edit_count + 1;
        NEW.last_edited_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER track_summary_edits
    BEFORE UPDATE ON summaries
    FOR EACH ROW
    EXECUTE FUNCTION track_summary_edit();
```

### 3. Soft Delete for Documents

```sql
-- Soft delete function
CREATE OR REPLACE FUNCTION soft_delete_document()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = TRUE AND OLD.is_deleted = FALSE THEN
        NEW.deleted_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_document_soft_delete
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete_document();
```

---

## Row Level Security (RLS) Policies

**Note:** Since this application uses user-provided identifiers instead of Supabase Auth, RLS policies are simplified. Access control is managed at the application level by passing the user_key or user_id with each request.

### Enable RLS on all tables

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE summaries ENABLE ROW LEVEL SECURITY;
```

### Application-Level Access Pattern

**Backend Implementation:**
```typescript
// Example: User provides their unique key in the request
// Backend validates and retrieves user_id, then uses it for all queries

async function getUserByKey(userKey: string): Promise<User | null> {
  const userKeyHash = crypto.createHash('sha256').update(userKey).digest('hex');
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('user_key_hash', userKeyHash)
    .single();
  return data;
}
```

### RLS Policies (Service Role)

```sql
-- Allow service role to access all data (backend manages access control)
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
```

**Security Notes:**
- Always use Supabase service role key on the backend (never expose to frontend)
- Validate user_key on every request
- Consider rate limiting per user_key to prevent abuse
- Frontend should store user_key securely (localStorage with encryption or sessionStorage)

---

## User Identification Flow

### How the User-Provided Key System Works

**Frontend Flow:**
```typescript
// 1. User enters their unique key (first time or returning)
const userKey = prompt("Enter your unique workspace identifier:");

// 2. Store securely in browser
sessionStorage.setItem('userKey', userKey);

// 3. Include in all API requests
const response = await fetch('/api/documents', {
  headers: {
    'X-User-Key': userKey
  }
});
```

**Backend Flow:**
```typescript
// 1. Extract user key from request
const userKey = req.headers['x-user-key'];

// 2. Validate format
if (!userKey || userKey.length < 8 || userKey.length > 255) {
  return res.status(400).json({ error: 'Invalid user key' });
}

// 3. Hash the key
const userKeyHash = crypto.createHash('sha256').update(userKey).digest('hex');

// 4. Get or create user
let user = await supabase
  .from('users')
  .select('*')
  .eq('user_key_hash', userKeyHash)
  .single();

if (!user.data) {
  // First time user - create new record
  const { data } = await supabase
    .from('users')
    .insert({
      user_key: userKey,
      user_key_hash: userKeyHash
    })
    .select()
    .single();
  user = data;
}

// 5. Update last access
await supabase
  .from('users')
  .update({ last_access_at: new Date().toISOString() })
  .eq('id', user.data.id);

// 6. Use user.data.id for all subsequent queries
```

**Security Best Practices:**
- User keys should be memorable but unique (e.g., "project-alpha-2024", "alice-work-docs")
- Frontend can offer to generate a random key for users (e.g., using UUID or memorable word combinations)
- Consider showing a warning: "Save this key! You'll need it to access your documents later"
- Backend should implement rate limiting per IP and per user_key_hash

**Example: Generating a User-Friendly Key**
```typescript
// Helper function to generate memorable keys
function generateUserKey(): string {
  const adjectives = ['swift', 'bright', 'clever', 'calm', 'bold'];
  const nouns = ['panda', 'eagle', 'tiger', 'falcon', 'wolf'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}-${noun}-${num}`;
}
// Example output: "swift-panda-742"
```

---

## Common Queries

### 1. Check for Cache Hit

```sql
-- When user opens a document, check if a summary already exists
SELECT 
    id,
    summary_content,
    language,
    style,
    is_edited,
    created_at,
    updated_at
FROM summaries
WHERE document_id = $1
    AND language = $2
    AND style = $3
    AND is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;
```

### 2. Get User Dashboard Data

```sql
-- Fetch all documents and their primary summaries for a user (by user_key)
WITH user_lookup AS (
    SELECT id FROM users WHERE user_key_hash = encode(digest($1, 'sha256'), 'hex')
)
SELECT 
    d.id AS document_id,
    d.original_filename,
    d.file_type,
    d.file_size_bytes,
    d.created_at AS uploaded_at,
    d.last_accessed_at,
    s.id AS summary_id,
    s.summary_content,
    s.language,
    s.style,
    s.is_edited,
    s.updated_at AS summary_updated_at
FROM documents d
LEFT JOIN summaries s ON d.id = s.document_id AND s.is_active = TRUE
WHERE d.user_id = (SELECT id FROM user_lookup)
    AND d.is_deleted = FALSE
ORDER BY d.created_at DESC;
-- $1 = user_key (the unique string user provides)
```

### 3. Get Document with All Summaries

```sql
-- Fetch a document with all its summary variations
SELECT 
    d.*,
    json_agg(
        json_build_object(
            'id', s.id,
            'content', s.summary_content,
            'language', s.language,
            'style', s.style,
            'is_edited', s.is_edited,
            'created_at', s.created_at,
            'updated_at', s.updated_at
        ) ORDER BY s.created_at DESC
    ) FILTER (WHERE s.id IS NOT NULL) AS summaries
FROM documents d
LEFT JOIN summaries s ON d.id = s.document_id
WHERE d.id = $1 AND d.user_id = $2
GROUP BY d.id;
```

### 4. Calculate Total API Costs

```sql
-- Calculate total tokens used by user (for cost tracking)
SELECT 
    u.user_key,
    u.display_name,
    COUNT(DISTINCT d.id) AS total_documents,
    COUNT(s.id) AS total_summaries,
    COALESCE(SUM(s.total_tokens), 0) AS total_tokens_used,
    COALESCE(SUM(s.input_tokens), 0) AS total_input_tokens,
    COALESCE(SUM(s.output_tokens), 0) AS total_output_tokens
FROM users u
LEFT JOIN documents d ON u.id = d.user_id
LEFT JOIN summaries s ON d.id = s.document_id
WHERE u.user_key_hash = encode(digest($1, 'sha256'), 'hex')
GROUP BY u.id, u.user_key, u.display_name;
-- $1 = user_key
```

---

## Performance Optimization Recommendations

### 1. Partitioning (for high-volume scenarios)

```sql
-- Partition summary_view_history by month for better query performance
CREATE TABLE summary_view_history_2026_02 PARTITION OF summary_view_history
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
```

### 2. Materialized Views for Analytics

```sql
-- Pre-compute user statistics
CREATE MATERIALIZED VIEW user_statistics AS
SELECT 
    u.id AS user_id,
    u.user_key_hash, -- Hashed for privacy
    COUNT(DISTINCT d.id) AS document_count,
    COUNT(DISTINCT s.id) AS summary_count,
    SUM(d.file_size_bytes) AS total_storage_used,
    SUM(s.total_tokens) AS total_tokens_used,
    MAX(d.created_at) AS last_upload_date,
    MAX(s.created_at) AS last_summary_date
FROM users u
LEFT JOIN documents d ON u.id = d.user_id AND d.is_deleted = FALSE
LEFT JOIN summaries s ON u.id = s.user_id
GROUP BY u.id, u.user_key_hash;

-- Refresh periodically
CREATE INDEX idx_user_stats_user_id ON user_statistics(user_id);
```

### 3. Vacuum and Analyze

```sql
-- Schedule regular maintenance
VACUUM ANALYZE documents;
VACUUM ANALYZE summaries;
```

---

## Migration Strategy

### Initial Setup Order

1. Create `users` table first (as it's referenced by others)
2. Create `documents` table (references users)
3. Create `summaries` table (references both users and documents)
4. Create optional tables (`summary_view_history`, `api_usage_logs`)
5. Create triggers and functions
6. Enable RLS and create policies
7. Create indexes

### Sample Migration Script

```sql
-- Run in this order:
\i 01_create_users_table.sql
\i 02_create_documents_table.sql
\i 03_create_summaries_table.sql
\i 04_create_optional_tables.sql
\i 05_create_triggers.sql
\i 06_create_rls_policies.sql
\i 07_create_indexes.sql
```

---

## Data Retention and Archival

```sql
-- Archive old documents (move to cold storage after 1 year)
CREATE TABLE documents_archive (LIKE documents INCLUDING ALL);

-- Function to archive old documents
CREATE OR REPLACE FUNCTION archive_old_documents()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    WITH moved_docs AS (
        DELETE FROM documents
        WHERE created_at < NOW() - INTERVAL '1 year'
            AND last_accessed_at < NOW() - INTERVAL '6 months'
            AND is_deleted = FALSE
        RETURNING *
    )
    INSERT INTO documents_archive
    SELECT * FROM moved_docs;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
```

---

## Security Considerations

1. **User Key Protection**: 
   - Hash user keys using SHA-256 before storage and lookup
   - Never log or expose user keys in error messages
   - Store user_key in frontend using secure storage (encrypted localStorage or sessionStorage)
   - Consider adding rate limiting per user_key to prevent brute force

2. **Encryption at Rest**: Enable PostgreSQL encryption for sensitive data

3. **Connection Security**: Always use SSL/TLS connections

4. **Service Role Protection**: 
   - Only use Supabase service role key on backend
   - Never expose service role key to frontend
   - Frontend should call backend API, not directly access Supabase

5. **API Key Storage**: Never store GitHub Models API keys in the database (use environment variables)

6. **Input Validation**: 
   - Validate user_key format (8-255 characters, alphanumeric + special chars)
   - Use parameterized queries to prevent SQL injection
   - Sanitize user inputs before passing to AI models

7. **Rate Limiting**: 
   - Implement per-user_key rate limiting for uploads and AI generation
   - Set quotas per user_key (e.g., max 100 documents, 1000 API calls per month)

8. **Data Cleanup**: Implement automatic cleanup of abandoned user data (inactive > 6 months)

9. **Audit Logging**: Consider adding an audit_logs table for compliance and abuse detection

---

## Backup and Disaster Recovery

```sql
-- Point-in-time recovery setup
-- Ensure WAL archiving is enabled in postgresql.conf
-- archive_mode = on
-- archive_command = 'cp %p /path/to/archive/%f'

-- Regular backup script (run daily)
-- pg_dump -Fc -f backup_$(date +%Y%m%d).dump your_database_name
```

---

## Monitoring Queries

```sql
-- Monitor database size
SELECT 
    pg_size_pretty(pg_database_size(current_database())) AS database_size;

-- Monitor table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

---

## Summary

This database schema provides:

✅ **Complete user and document management**
✅ **Intelligent summary caching** to reduce AI API costs
✅ **Flexible summary parameters** for different languages and styles
✅ **Edit tracking** to preserve original AI outputs
✅ **Soft deletes** for data recovery
✅ **Row Level Security** for multi-tenant data isolation
✅ **Comprehensive indexing** for optimal query performance
✅ **Audit trails** for compliance and debugging
✅ **Scalability considerations** for future growth

The schema is optimized for the core requirements while providing extension points for analytics, monitoring, and advanced features.
