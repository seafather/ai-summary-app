'use client';

import { useState, useEffect, useCallback } from 'react';
import UserKeyPrompt from '@/components/UserKeyPrompt';
import FileUpload from '@/components/FileUpload';
import FileList from '@/components/FileList';
import DocumentViewer from '@/components/DocumentViewer';
import { Document } from '@/lib/types/database';

export default function Home() {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!userKey) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/documents', {
        headers: {
          'x-user-key': userKey
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch documents');
      }

      setDocuments(data.documents || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setLoading(false);
    }
  }, [userKey]);

  useEffect(() => {
    if (userKey) {
      fetchDocuments();
    }
  }, [userKey, fetchDocuments]);

  const handleUserKeySet = (key: string) => {
    setUserKey(key);
  };

  const handleUploadSuccess = () => {
    fetchDocuments();
  };

  const handleRefresh = () => {
    fetchDocuments();
  };

  const handleViewDocument = (doc: Document) => {
    setSelectedDocument(doc);
  };

  const handleCloseViewer = () => {
    setSelectedDocument(null);
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out? You\'ll need your workspace identifier to access your documents again.')) {
      sessionStorage.removeItem('userKey');
      setUserKey(null);
      setDocuments([]);
      setSelectedDocument(null);
    }
  };

  if (!userKey) {
    return <UserKeyPrompt onUserKeySet={handleUserKeySet} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Summary App</h1>
              <p className="text-sm text-gray-500 mt-1">Upload and manage your documents</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Workspace:</span> {userKey}
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Upload Section */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Document</h2>
            <FileUpload onUploadSuccess={handleUploadSuccess} userKey={userKey} />
          </section>

          {/* Documents List Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">My Documents</h2>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg
                  className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            {loading && documents.length === 0 ? (
              <div className="flex items-center justify-center py-12 bg-white rounded-lg shadow">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-4 text-gray-600">Loading documents...</p>
              </div>
            ) : (
              <FileList
                documents={documents}
                userKey={userKey}
                onRefresh={handleRefresh}
                onViewDocument={handleViewDocument}
              />
            )}
          </section>
        </div>
      </main>

      {/* Document Viewer Modal */}
      <DocumentViewer
        document={selectedDocument}
        userKey={userKey}
        onClose={handleCloseViewer}
      />
    </div>
  );
}