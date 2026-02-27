'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Summary, Language, SummaryStyle, FileType, PdfSummaryMode, TxtSummaryMode, SummaryMode } from '@/lib/types/database';

/* ------------------------------------------------------------------ */
/*  JSON Summary Types                                                  */
/* ------------------------------------------------------------------ */

interface KeyTerm { term: string; definition: string; }

interface FullSummaryJson {
  mode: 'full-summary';
  executiveSummary: string;
  keyFindings: string[];
  keyTerms: KeyTerm[];
  relatedQuestions: string[];
}

interface ChapterOutlineJson {
  mode: 'chapter-outline';
  documentOverview: string;
  chapters: { title: string; pages: string | null; summary: string }[];
  keyTerms: KeyTerm[];
}

interface PageRangeJson {
  mode: 'page-range';
  pageRange: { from: number; to: number | string };
  summary: string;
  keyPoints: string[];
  keyTerms: KeyTerm[];
}

interface SemanticTopicsJson {
  mode: 'semantic-topics';
  executiveSummary: string;
  topics: { title: string; summary: string }[];
  keyTerms: KeyTerm[];
  relatedQuestions: string[];
}

interface MeetingMinutesJson {
  mode: 'meeting-minutes';
  meetingOverview: string;
  keyDecisions: string[];
  actionItems: { task: string; owner: string | null }[];
  discussionHighlights: { topic: string; summary: string }[];
  openQuestions: string[];
}

type SummaryJson = FullSummaryJson | ChapterOutlineJson | PageRangeJson | SemanticTopicsJson | MeetingMinutesJson;

function parseSummaryContent(content: string): SummaryJson | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'mode' in parsed) return parsed as SummaryJson;
  } catch { /* not JSON */ }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Full Summary                                                        */
/* ------------------------------------------------------------------ */

function FullSummaryView({ data }: { data: FullSummaryJson }) {
  return (
    <div className="space-y-4">

      {/* Executive Summary */}
      <div className="rounded-xl border border-blue-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-sm font-semibold text-white">Executive Summary</span>
        </div>
        <div className="p-4 bg-blue-50">
          <p className="text-sm text-gray-800 leading-relaxed">{data.executiveSummary}</p>
        </div>
      </div>

      {/* Key Findings */}
      {data.keyFindings?.length > 0 && (
        <div className="rounded-xl border border-emerald-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            <span className="text-sm font-semibold text-white">Key Findings</span>
            <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{data.keyFindings.length}</span>
          </div>
          <div className="divide-y divide-emerald-100">
            {data.keyFindings.map((f, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-white hover:bg-emerald-50 transition-colors">
                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{f}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Terms */}
      {data.keyTerms?.length > 0 && (
        <div className="rounded-xl border border-purple-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <span className="text-sm font-semibold text-white">Key Terms</span>
            <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{data.keyTerms.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-purple-100">
            {data.keyTerms.map((t, i) => (
              <div key={i} className="bg-white p-3 hover:bg-purple-50 transition-colors">
                <span className="block text-sm font-semibold text-purple-800 mb-1">{t.term}</span>
                <span className="block text-xs text-gray-600 leading-snug">{t.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Questions */}
      {data.relatedQuestions?.length > 0 && (
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-sm font-semibold text-white">Related Questions</span>
          </div>
          <div className="divide-y divide-amber-100">
            {data.relatedQuestions.map((q, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
                <span className="w-5 h-5 rounded-full bg-amber-300 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">Q</span>
                <p className="text-sm text-gray-700 leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Chapter Outline                                                     */
/* ------------------------------------------------------------------ */

function ChapterOutlineView({ data }: { data: ChapterOutlineJson }) {
  return (
    <div className="space-y-4">

      {/* Document Overview */}
      <div className="rounded-xl border border-blue-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-sm font-semibold text-white">Document Overview</span>
        </div>
        <div className="p-4 bg-blue-50">
          <p className="text-sm text-gray-800 leading-relaxed">{data.documentOverview}</p>
        </div>
      </div>

      {/* Chapters */}
      {data.chapters?.length > 0 && (
        <div className="rounded-xl border border-indigo-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            <span className="text-sm font-semibold text-white">Chapter / Section Breakdown</span>
            <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{data.chapters.length}</span>
          </div>
          <div className="divide-y divide-indigo-100">
            {data.chapters.map((ch, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-white hover:bg-indigo-50 transition-colors">
                <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h5 className="text-sm font-semibold text-gray-900">{ch.title}</h5>
                    {ch.pages && <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{ch.pages}</span>}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{ch.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Terms */}
      {data.keyTerms?.length > 0 && (
        <div className="rounded-xl border border-purple-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <span className="text-sm font-semibold text-white">Key Terms</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-purple-100">
            {data.keyTerms.map((t, i) => (
              <div key={i} className="bg-white p-3 hover:bg-purple-50 transition-colors">
                <span className="block text-sm font-semibold text-purple-800 mb-1">{t.term}</span>
                <span className="block text-xs text-gray-600 leading-snug">{t.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Range                                                          */
/* ------------------------------------------------------------------ */

function PageRangeView({ data }: { data: PageRangeJson }) {
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-800 rounded-full text-xs font-bold border border-sky-200">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 0v10"/></svg>
        Pages {data.pageRange?.from} – {data.pageRange?.to}
      </div>

      <div className="rounded-xl border border-sky-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-sky-600">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-sm font-semibold text-white">Summary</span>
        </div>
        <div className="p-4 bg-sky-50">
          <p className="text-sm text-gray-800 leading-relaxed">{data.summary}</p>
        </div>
      </div>

      {data.keyPoints?.length > 0 && (
        <div className="rounded-xl border border-emerald-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span className="text-sm font-semibold text-white">Key Points</span>
          </div>
          <div className="divide-y divide-emerald-100">
            {data.keyPoints.map((p, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-white hover:bg-emerald-50 transition-colors">
                <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-sm text-gray-700 leading-relaxed flex-1">{p}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.keyTerms?.length > 0 && (
        <div className="rounded-xl border border-purple-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <span className="text-sm font-semibold text-white">Key Terms</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-purple-100">
            {data.keyTerms.map((t, i) => (
              <div key={i} className="bg-white p-3 hover:bg-purple-50 transition-colors">
                <span className="block text-sm font-semibold text-purple-800 mb-1">{t.term}</span>
                <span className="block text-xs text-gray-600 leading-snug">{t.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Semantic Topics                                                     */
/* ------------------------------------------------------------------ */

function SemanticTopicsView({ data }: { data: SemanticTopicsJson }) {
  return (
    <div className="space-y-4">

      {/* Executive Summary */}
      <div className="rounded-xl border border-blue-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-sm font-semibold text-white">Executive Summary</span>
        </div>
        <div className="p-4 bg-blue-50">
          <p className="text-sm text-gray-800 leading-relaxed">{data.executiveSummary}</p>
        </div>
      </div>

      {/* Topics */}
      {data.topics?.length > 0 && (
        <div className="rounded-xl border border-violet-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            <span className="text-sm font-semibold text-white">Topic Analysis</span>
            <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{data.topics.length} topics</span>
          </div>
          <div className="divide-y divide-violet-100">
            {data.topics.map((t, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-white hover:bg-violet-50 transition-colors">
                <span className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-semibold text-gray-900 mb-1">{t.title}</h5>
                  <p className="text-xs text-gray-600 leading-relaxed">{t.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Terms */}
      {data.keyTerms?.length > 0 && (
        <div className="rounded-xl border border-purple-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            <span className="text-sm font-semibold text-white">Key Terms</span>
            <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{data.keyTerms.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-purple-100">
            {data.keyTerms.map((t, i) => (
              <div key={i} className="bg-white p-3 hover:bg-purple-50 transition-colors">
                <span className="block text-sm font-semibold text-purple-800 mb-1">{t.term}</span>
                <span className="block text-xs text-gray-600 leading-snug">{t.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Questions */}
      {data.relatedQuestions?.length > 0 && (
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-sm font-semibold text-white">Related Questions</span>
          </div>
          <div className="divide-y divide-amber-100">
            {data.relatedQuestions.map((q, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
                <span className="w-5 h-5 rounded-full bg-amber-300 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">Q</span>
                <p className="text-sm text-gray-700 leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Meeting Minutes                                                     */
/* ------------------------------------------------------------------ */

function MeetingMinutesView({ data }: { data: MeetingMinutesJson }) {
  return (
    <div className="space-y-4">

      {/* Meeting Overview */}
      <div className="rounded-xl border border-blue-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600">
          <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="text-sm font-semibold text-white">Meeting Overview</span>
        </div>
        <div className="p-4 bg-blue-50">
          <p className="text-sm text-gray-800 leading-relaxed">{data.meetingOverview}</p>
        </div>
      </div>

      {/* Key Decisions */}
      {data.keyDecisions?.length > 0 && (
        <div className="rounded-xl border border-emerald-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-sm font-semibold text-white">Key Decisions</span>
          </div>
          <div className="divide-y divide-emerald-100">
            {data.keyDecisions.map((d, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-white hover:bg-emerald-50 transition-colors">
                <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                <p className="text-sm text-gray-700 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      {data.actionItems?.length > 0 && (
        <div className="rounded-xl border border-orange-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-500">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <span className="text-sm font-semibold text-white">Action Items</span>
            <span className="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">{data.actionItems.length}</span>
          </div>
          <div className="divide-y divide-orange-100">
            {data.actionItems.map((a, i) => (
              <div key={i} className="flex gap-3 items-center px-4 py-3 bg-white hover:bg-orange-50 transition-colors">
                <div className="w-4 h-4 rounded border-2 border-orange-300 shrink-0" />
                <p className="text-sm text-gray-700 flex-1 leading-relaxed">{a.task}</p>
                {a.owner && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full shrink-0">
                    <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                    {a.owner}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discussion Highlights */}
      {data.discussionHighlights?.length > 0 && (
        <div className="rounded-xl border border-sky-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-sky-600">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            <span className="text-sm font-semibold text-white">Discussion Highlights</span>
          </div>
          <div className="divide-y divide-sky-100">
            {data.discussionHighlights.map((d, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-white hover:bg-sky-50 transition-colors">
                <span className="w-7 h-7 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-semibold text-gray-900 mb-1">{d.topic}</h5>
                  <p className="text-xs text-gray-600 leading-relaxed">{d.summary}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Questions */}
      {data.openQuestions?.length > 0 && (
        <div className="rounded-xl border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500">
            <svg className="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <span className="text-sm font-semibold text-white">Open Questions</span>
          </div>
          <div className="divide-y divide-amber-100">
            {data.openQuestions.map((q, i) => (
              <div key={i} className="flex gap-3 items-start px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
                <span className="w-5 h-5 rounded-full bg-amber-300 text-amber-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">?</span>
                <p className="text-sm text-gray-700 leading-relaxed">{q}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Router                                                              */
/* ------------------------------------------------------------------ */

function StructuredSummaryView({ content }: { content: string }) {
  const data = parseSummaryContent(content);
  if (!data) {
    return (
      <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }
  switch (data.mode) {
    case 'full-summary':    return <FullSummaryView data={data} />;
    case 'chapter-outline': return <ChapterOutlineView data={data} />;
    case 'page-range':      return <PageRangeView data={data} />;
    case 'semantic-topics': return <SemanticTopicsView data={data} />;
    case 'meeting-minutes': return <MeetingMinutesView data={data} />;
    default:                return null;
  }
}

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
            /* Structured Summary View (JSON-aware, Markdown fallback for legacy) */
            <StructuredSummaryView content={summary.summary_content} />
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
