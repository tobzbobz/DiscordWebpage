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
        <span key={i} style={{ background: '#fffacd', fontWeight: 'bold' }}>{part}</span>
      ) : part
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="search-modal-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <span>Advanced Search</span>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            {/* Search Input */}
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search records, patients, callsigns, medications..."
                className="search-input"
              />
              {loading && <span className="loading-spinner"></span>}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
                title="Toggle Filters"
              >
                ⚙️
              </button>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="search-filters">
                <div className="filter-field">
                  <label>Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as '' | 'incomplete' | 'complete' }))}
                    className="filter-select"
                  >
                    <option value="">All statuses</option>
                    <option value="incomplete">In Progress</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>
                <div className="filter-field">
                  <label>From Date</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="filter-input"
                  />
                </div>
                <div className="filter-field">
                  <label>To Date</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="filter-input"
                  />
                </div>
              </div>
            )}

            {/* Results */}
            <div ref={resultsRef} className="search-results">
              {!query.trim() ? (
                <div className="empty-state">
                  <p className="empty-icon">🔍</p>
                  <p>Start typing to search</p>
                  <p className="empty-hint">Search by incident ID, patient name, callsign, or keywords</p>
                </div>
              ) : results.length === 0 && !loading ? (
                <div className="empty-state">
                  <p className="empty-icon">📭</p>
                  <p>No results found</p>
                  <p className="empty-hint">Try different keywords or adjust filters</p>
                </div>
              ) : (
                results.map((result, index) => (
                  <div
                    key={`${result.incidentId}-${result.patientLetter}-${index}`}
                    data-index={index}
                    onClick={() => navigateToResult(result)}
                    className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                  >
                    <span className="result-icon">{getMatchIcon(result.matchType)}</span>
                    <div className="result-content">
                      <div className="result-header">
                        <span className="result-title">
                          Incident {result.incidentId}
                        </span>
                        {result.patientLetter && (
                          <span className="result-patient">
                            • Patient {result.patientLetter}
                          </span>
                        )}
                        <span className={`result-status ${result.status}`}>
                          {result.status === 'complete' ? 'Complete' : 'In Progress'}
                        </span>
                      </div>
                      <p className="result-match">
                        <span className="match-field">{result.matchedField}:</span>{' '}
                        {highlightMatch(result.matchedValue, query)}
                      </p>
                      <div className="result-meta">
                        <span>by {result.authorCallsign}</span>
                        <span>•</span>
                        <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="search-footer">
              <div className="keyboard-hints">
                <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
                <span><kbd>Enter</kbd> Open</span>
                <span><kbd>Esc</kbd> Close</span>
              </div>
              {results.length > 0 && (
                <span className="result-count">{results.length} result{results.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .search-modal-dialog {
          background: linear-gradient(to bottom, #b8d4ea 0%, #a0c4e0 100%);
          border: 3px solid #4a6d8c;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.4);
          min-width: 500px;
          max-width: 650px;
          width: 100%;
          overflow: hidden;
        }
        
        .modal-header {
          background: linear-gradient(to bottom, #4a6d8c 0%, #3d5a75 100%);
          color: white;
          padding: 12px 20px;
          font-size: 18px;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          border-bottom: 2px solid #2d4a5f;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .close-btn {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0 5px;
          line-height: 1;
        }
        
        .close-btn:hover {
          opacity: 0.8;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 2px solid #5a7a9a;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 15px;
        }
        
        .search-icon {
          font-size: 18px;
        }
        
        .search-input {
          flex: 1;
          border: none;
          font-size: 15px;
          font-family: Arial, Helvetica, sans-serif;
          outline: none;
        }
        
        .loading-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid #5a7a9a;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .filter-toggle-btn {
          background: none;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .filter-toggle-btn.active {
          background: #5a7a9a;
        }
        
        .search-filters {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          padding: 12px;
          background: rgba(255,255,255,0.5);
          border-radius: 6px;
          margin-bottom: 15px;
        }
        
        .filter-field label {
          display: block;
          font-size: 12px;
          font-weight: bold;
          color: #2d4a5f;
          margin-bottom: 4px;
        }
        
        .filter-select, .filter-input {
          width: 100%;
          padding: 6px 8px;
          border: 2px solid #5a7a9a;
          border-radius: 4px;
          font-size: 13px;
          font-family: Arial, Helvetica, sans-serif;
        }
        
        .search-results {
          max-height: 320px;
          overflow-y: auto;
          background: white;
          border: 2px solid #5a7a9a;
          border-radius: 6px;
        }
        
        .empty-state {
          padding: 30px;
          text-align: center;
          color: #5a7a9a;
        }
        
        .empty-icon {
          font-size: 36px;
          margin-bottom: 8px;
        }
        
        .empty-hint {
          font-size: 12px;
          margin-top: 4px;
          opacity: 0.7;
        }
        
        .result-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          cursor: pointer;
          border-bottom: 1px solid #e0e8f0;
          transition: background 0.15s;
        }
        
        .result-item:last-child {
          border-bottom: none;
        }
        
        .result-item:hover {
          background: #e8f0f8;
        }
        
        .result-item.selected {
          background: #d0e4f4;
        }
        
        .result-icon {
          font-size: 24px;
        }
        
        .result-content {
          flex: 1;
          min-width: 0;
        }
        
        .result-header {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        
        .result-title {
          font-weight: bold;
          color: #1a3a5c;
        }
        
        .result-patient {
          font-size: 13px;
          color: #5a7a9a;
        }
        
        .result-status {
          margin-left: auto;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: bold;
        }
        
        .result-status.complete {
          background: #d4edda;
          color: #155724;
        }
        
        .result-status.incomplete {
          background: #fff3cd;
          color: #856404;
        }
        
        .result-match {
          font-size: 13px;
          color: #2d4a5f;
          margin-top: 4px;
        }
        
        .match-field {
          color: #7a9ab8;
        }
        
        .result-meta {
          display: flex;
          gap: 8px;
          font-size: 11px;
          color: #7a9ab8;
          margin-top: 6px;
        }
        
        .search-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(90, 122, 154, 0.3);
          font-size: 12px;
          color: #5a7a9a;
        }
        
        .keyboard-hints {
          display: flex;
          gap: 15px;
        }
        
        .keyboard-hints kbd {
          background: #5a7a9a;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 10px;
          font-family: monospace;
        }
        
        .result-count {
          font-weight: bold;
        }
      `}</style>
    </>
  );
}
