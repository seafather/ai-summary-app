'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Summary, Language, SummaryStyle, FileType, PdfSummaryMode, TxtSummaryMode, SummaryMode } from '@/lib/types/database';

interface SummaryPanelProps {
  documentId: string;
  userKey: string;
  fileType: FileType;
}

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'English', label: 'English' },
  { value: 'Chinese-Traditional', label: '繁體中文' },
  { value: 'Chinese-Simplified', label: '简体中文' },
  { value: 'Japanese', label: '日本語' },
  { value: 'Spanish', label: 'Español' },
  { value: 'French', label: 'Français' },
  { value: 'German', label: 'Deutsch' },
];

const STYLES: { value: SummaryStyle; label: string; description: string }[] = [
  { value: 'standard', label: 'Standard', description: 'Clear, professional paragraphs' },
  { value: 'bullet-points', label: 'Bullet Points', description: 'Concise bullet-point list' },
  { value: 'vivid-emoji', label: 'Vivid & Fun 🎉', description: 'Engaging with emojis' },
];

const PDF_MODES: { value: PdfSummaryMode; label: string; icon: string; description: string }[] = [
  { value: 'full-summary', label: 'Full Summary', icon: '📑', description: 'Comprehensive overview of entire document' },
  { value: 'chapter-outline', label: 'By Chapter / Section', icon: '📖', description: 'Break down by detected chapters or headings' },
  { value: 'page-range', label: 'Page Range', icon: '🎯', description: 'Summarise specific pages only' },
];

const TXT_MODES: { value: TxtSummaryMode; label: string; icon: string; description: string }[] = [
  { value: 'semantic-topics', label: 'Smart Topic Analysis', icon: '🧠', description: 'AI identifies and groups core themes' },
  { value: 'meeting-minutes', label: 'Meeting Minutes', icon: '👥', description: 'Extract decisions, action items & highlights' },
];

export default function SummaryPanel({ documentId, userKey, fileType }: SummaryPanelProps) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Configuration options
  const [language, setLanguage] = useState<Language>('English');
  const [style, setStyle] = useState<SummaryStyle>('standard');
  const [maxBulletPoints, setMaxBulletPoints] = useState(4);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>(
    fileType === 'pdf' ? 'full-summary' : 'semantic-topics'
  );
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(10);

  // Ref for scrolling the panel to the top when switching views
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    // Scroll the nearest scrollable ancestor (overflow-y-auto parent) to top
    panelRef.current?.closest('.overflow-y-auto')?.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  // Reset mode when fileType changes
  useEffect(() => {
    setSummaryMode(fileType === 'pdf' ? 'full-summary' : 'semantic-topics');
  }, [fileType]);

  // Fetch existing summary on mount
  const fetchExistingSummary = useCallback(async () => {
    setSummary(null);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/summary/${documentId}`, {
        headers: {
          'x-user-key': userKey,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }

      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
        setLanguage(data.summary.language);
      }
    } catch {
      // No existing summary is fine, don't show error
      console.log('No existing summary found');
    } finally {
      setLoading(false);
    }
  }, [documentId, userKey]);

  useEffect(() => {
    fetchExistingSummary();
  }, [fetchExistingSummary]);

  // Generate summary
  const handleGenerate = async (forceRegenerate = false) => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-key': userKey,
        },
        body: JSON.stringify({
          documentId,
          language,
          style,
          summaryMode,
          pageRange: summaryMode === 'page-range' ? { from: pageFrom, to: pageTo } : undefined,
          maxBulletPoints: style === 'bullet-points' ? maxBulletPoints : undefined,
          forceRegenerate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  // Save edited summary
  const handleSave = async () => {
    if (!summary) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/summary/${documentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-key': userKey,
        },
        body: JSON.stringify({
          summaryId: summary.id,
          content: editContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save summary');
      }

      const data = await response.json();
      setSummary(data.summary);
      setIsEditing(false);
      scrollToTop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save summary');
    } finally {
      setSaving(false);
    }
  };

  // Start editing
  const startEditing = () => {
    if (summary) {
      setEditContent(summary.summary_content);
      setIsEditing(true);
      scrollToTop();
    }
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditContent('');
    scrollToTop();
  };

  if (loading) {
    return (
      <div className="rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="ml-3 text-gray-600">Loading summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl" ref={panelRef}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900 mr-3">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </span>
        AI Summary
      </h3>

      {/* Configuration Panel - shown when no summary yet */}
      {!summary && (
        <div className="space-y-5 mb-6 p-4 sm:p-5 bg-gray-50 rounded-xl border border-gray-200/80 shadow-sm">

          {/* Summary Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              {fileType === 'pdf' ? '📄 PDF Summary Mode' : '📝 Text Summary Mode'}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(fileType === 'pdf' ? PDF_MODES : TXT_MODES).map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setSummaryMode(mode.value as SummaryMode)}
                  disabled={generating}
                  className={`relative flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                    summaryMode === mode.value
                      ? 'border-gray-900 bg-gray-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                  } ${generating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className="text-lg flex-shrink-0 mt-0.5">{mode.icon}</span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm font-semibold block ${summaryMode === mode.value ? 'text-gray-900' : 'text-gray-700'}`}>
                      {mode.label}
                    </span>
                    <span className={`text-xs mt-0.5 block ${summaryMode === mode.value ? 'text-gray-600' : 'text-gray-400'}`}>
                      {mode.description}
                    </span>
                  </div>
                  {summaryMode === mode.value && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Page Range Input (only for page-range mode) */}
          {summaryMode === 'page-range' && (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🎯 Specify Page Range
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">From Page</label>
                  <input
                    type="number"
                    min="1"
                    value={pageFrom}
                    onChange={(e) => setPageFrom(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900"
                    disabled={generating}
                  />
                </div>
                <span className="text-gray-400 mt-5">—</span>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">To Page</label>
                  <input
                    type="number"
                    min={pageFrom}
                    value={pageTo}
                    onChange={(e) => setPageTo(Math.max(pageFrom, parseInt(e.target.value) || pageFrom))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-800 focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900"
                    disabled={generating}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Language Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Output Language
            </label>
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-800 shadow-sm hover:border-gray-300 focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all cursor-pointer"
                disabled={generating}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Summary Style
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {STYLES.map((styleOption) => (
                <button
                  key={styleOption.value}
                  type="button"
                  onClick={() => setStyle(styleOption.value as SummaryStyle)}
                  disabled={generating}
                  className={`relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200 ${
                    style === styleOption.value
                      ? 'border-gray-900 bg-gray-50 shadow-sm'
                      : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                  } ${generating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <span className={`text-sm font-semibold ${style === styleOption.value ? 'text-gray-900' : 'text-gray-700'}`}>
                    {styleOption.label}
                  </span>
                  <span className={`text-[11px] mt-0.5 ${style === styleOption.value ? 'text-gray-600' : 'text-gray-400'}`}>
                    {styleOption.description}
                  </span>
                  {style === styleOption.value && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bullet Points Count */}
          {style === 'bullet-points' && (
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Bullet Points per Section</span>
                <span className="text-gray-900 font-bold text-lg">{maxBulletPoints}</span>
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={maxBulletPoints}
                onChange={(e) => setMaxBulletPoints(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                disabled={generating}
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>Concise (2)</span>
                <span>Detailed (10)</span>
              </div>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={() => handleGenerate(false)}
            disabled={generating}
            className="group w-full py-3 px-4 bg-gray-900 text-white font-semibold rounded-xl hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {generating ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI is thinking...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Summary
              </span>
            )}
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Summary Display */}
      {summary && (
        <div className="space-y-5">
          {/* Summary Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500">
            <div className="flex items-center flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-200 text-gray-800">
                {summary.language}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700">
                {summary.style}
              </span>
              {summary.is_edited && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700">
                  Edited
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">
              {summary.model_used} &middot; {new Date(summary.created_at).toLocaleDateString()}
            </span>
          </div>

          {/* Editing Mode */}
          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-64 p-4 font-mono text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all resize-y"
                placeholder="Edit your summary (Markdown supported)..."
              />
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={saving}
                  className="px-4 py-2 bg-white text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Markdown Rendered View */
            <div className="bg-white rounded-xl border border-gray-200/80 p-4 sm:p-5 shadow-sm">
              <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
                <ReactMarkdown>{summary.summary_content}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={startEditing}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
              <button
                onClick={() => { setSummary(null); scrollToTop(); }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(summary.summary_content);
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
