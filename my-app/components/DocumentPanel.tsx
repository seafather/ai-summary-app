'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Document } from '@/lib/types/database';
import SummaryPanel from './SummaryPanel';

// 动态导入 PDF 渲染组件，避免 SSR 问题
const PDFRenderer = dynamic(() => import('./PDFRenderer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <p className="ml-3 text-gray-600">Loading PDF viewer...</p>
    </div>
  ),
});

interface DocumentPanelProps {
  document: Document | null;
  userKey: string;
}

export default function DocumentPanel({ document, userKey }: DocumentPanelProps) {
  const [content, setContent] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocument = useCallback(async () => {
    if (!document) return;

    setLoading(true);
    setError(null);
    setContent(null);
    
    // Clean up previous PDF URL before loading new one
    setPdfUrl(prev => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });

    try {
      const response = await fetch(`/api/documents/${document.id}/download`, {
        headers: {
          'x-user-key': userKey
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load document');
      }

      if (document.file_type === 'txt') {
        const text = await response.text();
        setContent(text);
      } else if (document.file_type === 'pdf') {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [document, userKey]);

  useEffect(() => {
    if (document) {
      loadDocument();
    } else {
      setContent(null);
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
    }
  }, [document, loadDocument]);

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 m-3 sm:m-0">
        <div className="text-center px-4">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">Select a document to preview</p>
          <p className="mt-1 text-xs text-gray-400 lg:hidden">Tap the menu icon to view your documents</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Document Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 rounded-t-lg">
        <div className="flex items-center space-x-3 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {document.original_filename}
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
            {document.file_type.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Two Column Layout: Document Preview + AI Summary */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-2 gap-4 p-3 sm:p-4 bg-gray-50 overflow-hidden min-h-0">
        {/* Document Preview */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
            <h4 className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
              <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Document Preview
            </h4>
          </div>
          <div className="flex-grow overflow-y-auto p-3 sm:p-4 min-h-0">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-600">Loading document...</p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {!loading && !error && document.file_type === 'txt' && content !== null && (
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 bg-gray-50 p-4 rounded-lg">
                {content || '(Empty file)'}
              </pre>
            )}

            {!loading && !error && document.file_type === 'pdf' && pdfUrl && (
              <PDFRenderer pdfUrl={pdfUrl} />
            )}

            {!loading && !error && !content && !pdfUrl && (
              <div className="flex items-center justify-center py-12 text-gray-500">
                Unable to load document preview
              </div>
            )}
          </div>
        </div>

        {/* AI Summary Panel */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col min-h-0">
          <div className="flex-grow overflow-y-auto p-3 sm:p-4 min-h-0">
            <SummaryPanel documentId={document.id} userKey={userKey} />
          </div>
        </div>
      </div>
    </div>
  );
}
