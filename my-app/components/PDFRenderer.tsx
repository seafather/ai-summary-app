'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Use the locally-served worker file (copied to public/ via CopyPlugin)
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFRendererProps {
  pdfUrl: string;
}

const PAGES_PER_LOAD = 5;
const INITIAL_PAGES = 3;

export default function PDFRenderer({ pdfUrl }: PDFRendererProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [loadedPages, setLoadedPages] = useState<number>(INITIAL_PAGES);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [pageErrors, setPageErrors] = useState<Record<number, string>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset state when URL changes
  useEffect(() => {
    setNumPages(0);
    setLoadedPages(INITIAL_PAGES);
    setShowScrollTop(false);
    setPageErrors({});
  }, [pdfUrl]);

  // Use IntersectionObserver for reliable lazy-load detection
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container || numPages === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadedPages((prev) => {
            if (prev >= numPages) return prev;
            return Math.min(prev + PAGES_PER_LOAD, numPages);
          });
        }
      },
      { root: container, rootMargin: '300px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [numPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoadedPages(Math.min(INITIAL_PAGES, numPages));
  };

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    setShowScrollTop(container.scrollTop > 300);
  }, []);

  const handleLoadMore = () => {
    setLoadedPages((prev) => Math.min(prev + PAGES_PER_LOAD, numPages));
  };

  const handleLoadAll = () => {
    setLoadedPages(numPages);
  };

  const handlePageError = (pageNum: number, error: Error) => {
    setPageErrors((prev) => ({ ...prev, [pageNum]: error.message }));
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const pagesToRender = Math.min(loadedPages, numPages);

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      {numPages > 0 && (
        <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
          <span className="text-sm text-gray-700 font-medium">
            Showing {pagesToRender} of {numPages} pages
          </span>
          {pagesToRender < numPages ? (
            <div className="flex items-center gap-3">
              <button
                onClick={handleLoadMore}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
              >
                Load {Math.min(PAGES_PER_LOAD, numPages - pagesToRender)} more
              </button>
              <button
                onClick={handleLoadAll}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium underline"
              >
                Load all
              </button>
            </div>
          ) : (
            <span className="text-xs text-green-600 font-medium">
              All pages loaded
            </span>
          )}
        </div>
      )}

      {/* PDF container */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="max-h-[600px] overflow-y-auto border border-gray-200 rounded-lg bg-white p-4"
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <p className="ml-3 text-gray-600">Loading PDF...</p>
              </div>
            }
            error={
              <div className="p-4 text-red-600">
                Failed to load PDF. Please try again.
              </div>
            }
          >
            {numPages > 0 &&
              Array.from({ length: pagesToRender }, (_, index) => {
                const pageNum = index + 1;
                const pageError = pageErrors[pageNum];

                return (
                  <div
                    key={`page_${pageNum}`}
                    className="flex flex-col items-center mb-6"
                  >
                    <div className="bg-white shadow-md border border-gray-100 mb-2">
                      {pageError ? (
                        <div className="flex flex-col items-center justify-center w-[700px] h-[300px] bg-red-50 text-red-600">
                          <p className="text-sm font-medium mb-2">
                            Failed to render page {pageNum}
                          </p>
                          <p className="text-xs text-red-400">{pageError}</p>
                        </div>
                      ) : (
                        <Page
                          pageNumber={pageNum}
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          width={700}
                          onLoadError={(err) => handlePageError(pageNum, err)}
                          onRenderError={(err) => handlePageError(pageNum, err)}
                          loading={
                            <div className="flex items-center justify-center w-[700px] h-[400px] bg-gray-50">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                            </div>
                          }
                        />
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      Page {pageNum} of {numPages}
                    </span>
                  </div>
                );
              })}
          </Document>

          {/* Sentinel element for IntersectionObserver */}
          {numPages > 0 && pagesToRender < numPages && (
            <div ref={sentinelRef} className="py-6 mt-4">
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"></div>
                  <span className="text-sm font-medium text-blue-700">
                    Scroll to load more pages...
                  </span>
                </div>
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  Load pages {pagesToRender + 1}–
                  {Math.min(pagesToRender + PAGES_PER_LOAD, numPages)}
                </button>
              </div>
            </div>
          )}

          {/* End of document */}
          {numPages > 0 && pagesToRender >= numPages && (
            <div className="flex items-center justify-center py-4 mt-4 text-sm text-gray-400">
              — End of document —
            </div>
          )}
        </div>

        {/* Scroll-to-top button */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="absolute bottom-4 right-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110"
            aria-label="Scroll to top"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 10l7-7m0 0l7 7m-7-7v18"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
