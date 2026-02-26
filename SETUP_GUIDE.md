# File Upload and Management - Setup Guide

## Overview
This implementation completes **Section 1: File Upload and Management** from the basic requirements. The system provides a complete file upload, storage, and viewing solution using Supabase Storage and Next.js.

## Features Implemented

### ✅ 1.1 File Upload Interface
- **Drag & Drop** support using react-dropzone
- **Click-to-Select** file picker
- File type validation (PDF and TXT only)
- Visual feedback with loading spinner and progress bar
- File size validation (max 50MB)

### ✅ 1.2 Cloud Storage Integration
- Supabase Storage integration for file persistence
- UUID + timestamp naming convention to prevent conflicts
- Automatic file upload to cloud storage buckets
- Database metadata tracking

### ✅ 1.3 File List and Deletion
- Real-time document list rendering
- File metadata display (name, type, size, date)
- Delete functionality with confirmation
- Soft delete in database with storage cleanup
- Automatic UI refresh after operations

### ✅ 1.4 Built-in Document Viewer
- Modal-based document viewer
- **PDF Viewer** using react-pdf with page navigation
- **TXT Viewer** with formatted text display
- Inline viewing without download requirement

## Project Structure

```
my-app/
├── app/
│   ├── api/
│   │   └── documents/
│   │       ├── route.ts              # Upload & list documents
│   │       └── [id]/
│   │           ├── route.ts          # Get & delete document
│   │           └── download/
│   │               └── route.ts      # Download file content
│   ├── page.tsx                      # Main application page
│   └── globals.css                   # Global styles
├── components/
│   ├── UserKeyPrompt.tsx             # User authentication
│   ├── FileUpload.tsx                # File upload with drag & drop
│   ├── FileList.tsx                  # Document list with delete
│   └── DocumentViewer.tsx            # PDF & TXT viewer modal
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   └── server.ts                 # Server Supabase client
│   ├── types/
│   │   └── database.ts               # TypeScript types
│   └── utils/
│       └── user.ts                   # User management utilities
└── .env.local.example                # Environment variables template
```

## Setup Instructions

### 1. Install Dependencies
Dependencies have already been installed:
- `@supabase/supabase-js` - Supabase client
- `react-pdf` - PDF viewer
- `react-dropzone` - File upload with drag & drop

### 2. Configure Supabase

#### A. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Wait for database to be provisioned

#### B. Create Storage Bucket
1. In Supabase dashboard, go to **Storage**
2. Create a new bucket named `documents`
3. Set bucket to **Private** (files require authentication)

#### C. Create Database Tables
Run this SQL in Supabase SQL Editor:

```sql
-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_key VARCHAR(255) UNIQUE NOT NULL,
    user_key_hash VARCHAR(64) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    default_language VARCHAR(20) DEFAULT 'English',
    default_style VARCHAR(50) DEFAULT 'standard',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_access_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT user_key_length CHECK (LENGTH(user_key) >= 8 AND LENGTH(user_key) <= 255)
);

CREATE INDEX idx_users_user_key_hash ON users(user_key_hash);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Create documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) UNIQUE NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'documents',
    storage_path TEXT NOT NULL,
    extracted_text TEXT,
    text_char_count INTEGER,
    mime_type VARCHAR(100),
    upload_ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT valid_file_type CHECK (file_type IN ('pdf', 'txt')),
    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0 AND file_size_bytes <= 52428800),
    CONSTRAINT unique_storage_path UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_is_deleted ON documents(is_deleted) WHERE is_deleted = FALSE;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (service role bypass)
CREATE POLICY users_service_role ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY documents_service_role ON documents FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

#### D. Set Environment Variables
1. Copy `.env.local.example` to `.env.local`
2. Fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Where to find these values:**
- Go to Supabase Dashboard > Project Settings > API
- `NEXT_PUBLIC_SUPABASE_URL` = Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Project API Keys > anon public
- `SUPABASE_SERVICE_ROLE_KEY` = Project API Keys > service_role (⚠️ Keep secret!)

### 3. Run the Application

```bash
cd my-app
npm run dev
```

Open http://localhost:3000

## User Authentication Flow

This app uses a **user-key based authentication** system (no passwords):

1. User enters a unique workspace identifier (8-255 characters)
2. System generates SHA-256 hash for secure lookup
3. User record created automatically on first access
4. Key stored in browser sessionStorage
5. All API requests include `x-user-key` header

**User Experience:**
- First-time users can generate a random memorable key (e.g., "swift-panda-742")
- Returning users enter their existing key to access their documents
- No email or password required

## API Endpoints

### `POST /api/documents`
Upload a new document
- **Headers:** `x-user-key: <user-key>`
- **Body:** FormData with `file` field
- **Response:** Created document metadata

### `GET /api/documents`
List user's documents
- **Headers:** `x-user-key: <user-key>`
- **Response:** Array of document metadata

### `GET /api/documents/[id]`
Get document details with signed URL
- **Headers:** `x-user-key: <user-key>`
- **Response:** Document metadata + signed URL

### `DELETE /api/documents/[id]`
Delete a document (soft delete)
- **Headers:** `x-user-key: <user-key>`
- **Response:** Success confirmation

### `GET /api/documents/[id]/download`
Download file content
- **Headers:** `x-user-key: <user-key>`
- **Response:** File binary data

## Testing the Implementation

### 1. Test File Upload
1. Open the app and enter/generate a user key
2. Click or drag a PDF/TXT file to the upload zone
3. Verify progress indicator shows
4. Confirm file appears in the list

### 2. Test File List
1. Verify uploaded files display with correct metadata
2. Check file type icons (PDF/TXT)
3. Verify file size and upload date format

### 3. Test Document Viewer
1. Click "View" button on a document
2. **For PDF:** Verify page navigation works
3. **For TXT:** Verify text displays correctly
4. Test close button

### 4. Test File Deletion
1. Click "Delete" button on a document
2. Confirm deletion dialog
3. Verify file disappears from list
4. Check Supabase Storage to confirm removal

### 5. Test User Key Persistence
1. Upload a file
2. Refresh the page
3. Verify user remains logged in (sessionStorage)
4. Open in incognito/new session
5. Enter same user key and verify files are accessible

## Security Considerations

✅ **Implemented:**
- User keys hashed with SHA-256 before storage
- Service role key only used server-side (never exposed to client)
- Row Level Security enabled on all tables
- File type validation (PDF/TXT only)
- File size validation (50MB max)
- User-key based data isolation

⚠️ **Additional Recommendations:**
1. Add rate limiting (e.g., max 10 uploads per minute per user-key)
2. Implement IP-based throttling
3. Add virus scanning for uploaded files
4. Set up CORS properly in production
5. Monitor storage usage per user
6. Implement data retention policies

## Next Steps

This completes **Section 1** of the requirements. The following features are ready to be implemented:

### 📋 Section 2: AI Summary Generation (Not Yet Implemented)
- Text extraction from PDF files
- Custom summary configuration UI
- GitHub Models API integration
- Markdown renderer and editor

### 📋 Section 3: Summary Caching (Not Yet Implemented)
- Summary database schema (already designed)
- Cache hit/miss logic
- Summary CRUD operations
- Edit tracking

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:** Ensure `.env.local` exists with correct values and restart dev server

### Issue: Upload fails with 500 error
**Solution:** 
1. Check Supabase Storage bucket exists and is named "documents"
2. Verify service role key is correct
3. Check browser console and server logs for details

### Issue: PDF viewer shows blank page
**Solution:**
1. Verify PDF file is not corrupted
2. Check browser console for pdf.js errors
3. Ensure PDF is not password-protected

### Issue: "Document not found" when viewing
**Solution:**
1. Verify file exists in Supabase Storage
2. Check user-key matches document owner
3. Confirm document is_deleted = false in database

## Support

For issues or questions:
1. Check Supabase dashboard for storage and database status
2. Review browser console for frontend errors
3. Check server logs for API errors
4. Verify environment variables are set correctly
