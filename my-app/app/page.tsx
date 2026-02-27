'use client';

import { useState, useEffect, useCallback } from 'react';
import UserKeyPrompt from '@/components/UserKeyPrompt';
import FileUpload from '@/components/FileUpload';
import FileList from '@/components/FileList';
import DocumentPanel from '@/components/DocumentPanel';
import { Document } from '@/lib/types/database';

export default function Home() {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    setSidebarOpen(false); // Auto-close sidebar on mobile when viewing a doc
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
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm flex-shrink-0">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 -ml-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                aria-label="Toggle sidebar"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">AI Summary App</h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">Upload documents and generate AI summaries</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="text-xs sm:text-sm text-gray-600 hidden sm:block">
                <span className="font-medium">Workspace:</span> {userKey}
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Two Column Layout */}
      <main className="flex-grow flex overflow-hidden relative">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar - Upload & File List */}
        <aside className={`
          fixed inset-y-0 left-0 z-30 w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden
          transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:w-80 xl:w-96 lg:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Mobile sidebar close area - just adds top padding on mobile */}
          <div className="h-14 lg:h-0 flex-shrink-0" />

          {/* Upload Section */}
          <div className="p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Upload Document</h2>
            <FileUpload onUploadSuccess={handleUploadSuccess} userKey={userKey} />
          </div>

          {/* Documents List Section */}
          <div className="flex-grow flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">My Documents</h2>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="inline-flex items-center px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                title="Refresh"
              >
                <svg
                  className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {error && (
              <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex-grow overflow-y-auto p-4">
              {loading && documents.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <p className="ml-3 text-gray-600 text-sm">Loading...</p>
                </div>
              ) : (
                <FileList
                  documents={documents}
                  userKey={userKey}
                  onRefresh={handleRefresh}
                  onViewDocument={handleViewDocument}
                  selectedDocumentId={selectedDocument?.id}
                />
              )}
            </div>
          </div>
        </aside>

        {/* Right Panel - Document Preview & AI Summary */}
        <div className="flex-grow overflow-hidden">
          <DocumentPanel document={selectedDocument} userKey={userKey} />
        </div>
      </main>
    </div>
  );
}