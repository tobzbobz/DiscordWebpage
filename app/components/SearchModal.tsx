'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { searchRecords, type SearchResult } from '../utils/apiClient';

interface SearchModalProps {
  discordId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ discordId, isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filters, setFilters] = useState({
    status: '' as '' | 'incomplete' | 'complete',
    dateFrom: '',
    dateTo: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchRecords(
        discordId,
        searchQuery,
        {
          status: filters.status || undefined,
          dateFrom: filters.dateFrom || undefined,
          dateTo: filters.dateTo || undefined
        }
      );
      setResults(searchResults);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  }, [discordId, filters]);

  // Handle input change with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigateToResult(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Navigate to result
  const navigateToResult = (result: SearchResult) => {
    const path = result.patientLetter
      ? `/incident?id=${result.incidentId}&patient=${result.patientLetter}`
      : `/incident?id=${result.incidentId}`;
    router.push(path);
    onClose();
  };

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = resultsRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Match type icons
  const getMatchIcon = (matchType: string) => {
    switch (matchType) {
      case 'incident':
        return '📋';
      case 'patient':
        return '👤';
      case 'callsign':
        return '🔖';
      case 'medication':
        return '💊';
      case 'intervention':
        return '🩺';
      case 'clinical':
        return '📝';
      default:
        return '🔍';
    }
  };

  // Highlight matching text
  const highlightMatch = (text: string, searchQuery: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} className="bg-yellow-500/30 text-yellow-200 font-medium">{part}</span>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search records, patients, callsigns, medications..."
              className="flex-1 bg-transparent text-white text-lg focus:outline-none placeholder:text-slate-500"
            />
            {loading && (
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as '' | 'incomplete' | 'complete' }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All statuses</option>
                  <option value="incomplete">In Progress</option>
                  <option value="complete">Complete</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div ref={resultsRef} className="max-h-96 overflow-y-auto">
          {!query.trim() ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-4xl mb-2">🔍</p>
              <p>Start typing to search</p>
              <p className="text-sm mt-1">Search by incident ID, patient name, callsign, or keywords</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="p-8 text-center text-slate-400">
              <p className="text-4xl mb-2">📭</p>
              <p>No results found</p>
              <p className="text-sm mt-1">Try different keywords or adjust filters</p>
            </div>
          ) : (
            results.map((result, index) => (
              <div
                key={`${result.incidentId}-${result.patientLetter}-${index}`}
                data-index={index}
                onClick={() => navigateToResult(result)}
                className={`p-4 cursor-pointer border-b border-slate-700/50 transition-colors ${
                  index === selectedIndex ? 'bg-blue-600/20' : 'hover:bg-slate-700/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getMatchIcon(result.matchType)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        Incident {result.incidentId}
                      </span>
                      {result.patientLetter && (
                        <span className="text-sm text-slate-400">
                          • Patient {result.patientLetter}
                        </span>
                      )}
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded ${
                        result.status === 'complete' 
                          ? 'bg-green-600/30 text-green-400' 
                          : 'bg-amber-600/30 text-amber-400'
                      }`}>
                        {result.status === 'complete' ? 'Complete' : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 mt-1">
                      <span className="text-slate-500">{result.matchedField}:</span>{' '}
                      {highlightMatch(result.matchedValue, query)}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>by {result.authorCallsign}</span>
                      <span>•</span>
                      <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="text-blue-400">Score: {Math.round(result.relevanceScore)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">↑</kbd> <kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">↓</kbd> Navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">Enter</kbd> Open</span>
            <span><kbd className="px-1.5 py-0.5 bg-slate-700 rounded font-mono">Esc</kbd> Close</span>
          </div>
          {results.length > 0 && (
            <span>{results.length} result{results.length !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}
