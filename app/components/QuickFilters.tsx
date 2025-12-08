'use client';

import React from 'react';

export interface QuickFiltersState {
  showMyRecords: boolean;
  showSharedWithMe: boolean;
  showIncomplete: boolean;
  showComplete: boolean;
  dateRange?: 'today' | 'week' | 'month' | 'all';
  sortBy?: 'date-desc' | 'date-asc' | 'incident-id' | 'status';
}

interface QuickFiltersProps {
  filters: QuickFiltersState;
  onChange: (filters: QuickFiltersState) => void;
  counts?: {
    myRecords: number;
    sharedWithMe: number;
    incomplete: number;
    complete: number;
  };
  compact?: boolean;
}

export default function QuickFilters({
  filters,
  onChange,
  counts,
  compact = false
}: QuickFiltersProps) {
  const toggleFilter = (key: keyof QuickFiltersState) => {
    if (typeof filters[key] === 'boolean') {
      onChange({ ...filters, [key]: !filters[key] });
    }
  };

  const setDateRange = (range: QuickFiltersState['dateRange']) => {
    onChange({ ...filters, dateRange: range });
  };

  const setSortBy = (sort: QuickFiltersState['sortBy']) => {
    onChange({ ...filters, sortBy: sort });
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => toggleFilter('showMyRecords')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
            filters.showMyRecords
              ? 'bg-blue-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          My Records
          {counts?.myRecords !== undefined && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{counts.myRecords}</span>
          )}
        </button>

        <button
          onClick={() => toggleFilter('showSharedWithMe')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
            filters.showSharedWithMe
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Shared
          {counts?.sharedWithMe !== undefined && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{counts.sharedWithMe}</span>
          )}
        </button>

        <button
          onClick={() => toggleFilter('showIncomplete')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
            filters.showIncomplete
              ? 'bg-amber-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          In Progress
          {counts?.incomplete !== undefined && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{counts.incomplete}</span>
          )}
        </button>

        <button
          onClick={() => toggleFilter('showComplete')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 transition-colors ${
            filters.showComplete
              ? 'bg-green-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Complete
          {counts?.complete !== undefined && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">{counts.complete}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-slate-300">Quick Filters</h3>
        <button
          onClick={() => onChange({
            showMyRecords: true,
            showSharedWithMe: true,
            showIncomplete: true,
            showComplete: false,
            dateRange: 'all',
            sortBy: 'date-desc'
          })}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Reset
        </button>
      </div>

      {/* Ownership filters */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => toggleFilter('showMyRecords')}
          className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
            filters.showMyRecords
              ? 'bg-blue-600/20 border-2 border-blue-500 text-blue-300'
              : 'bg-slate-700/50 border-2 border-transparent text-slate-400 hover:bg-slate-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm font-medium">My Records</span>
          {counts?.myRecords !== undefined && (
            <span className="text-xs opacity-70">{counts.myRecords}</span>
          )}
        </button>

        <button
          onClick={() => toggleFilter('showSharedWithMe')}
          className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
            filters.showSharedWithMe
              ? 'bg-purple-600/20 border-2 border-purple-500 text-purple-300'
              : 'bg-slate-700/50 border-2 border-transparent text-slate-400 hover:bg-slate-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="text-sm font-medium">Shared With Me</span>
          {counts?.sharedWithMe !== undefined && (
            <span className="text-xs opacity-70">{counts.sharedWithMe}</span>
          )}
        </button>
      </div>

      {/* Status filters */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => toggleFilter('showIncomplete')}
          className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
            filters.showIncomplete
              ? 'bg-amber-600/20 border-2 border-amber-500 text-amber-300'
              : 'bg-slate-700/50 border-2 border-transparent text-slate-400 hover:bg-slate-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">In Progress</span>
          {counts?.incomplete !== undefined && (
            <span className="text-xs opacity-70">{counts.incomplete}</span>
          )}
        </button>

        <button
          onClick={() => toggleFilter('showComplete')}
          className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
            filters.showComplete
              ? 'bg-green-600/20 border-2 border-green-500 text-green-300'
              : 'bg-slate-700/50 border-2 border-transparent text-slate-400 hover:bg-slate-700'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Complete</span>
          {counts?.complete !== undefined && (
            <span className="text-xs opacity-70">{counts.complete}</span>
          )}
        </button>
      </div>

      {/* Date range */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">Date Range</label>
        <div className="flex gap-1">
          {(['today', 'week', 'month', 'all'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                filters.dateRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'Week' : range === 'month' ? 'Month' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Sort by */}
      <div>
        <label className="text-xs text-slate-400 mb-2 block">Sort By</label>
        <select
          value={filters.sortBy || 'date-desc'}
          onChange={(e) => setSortBy(e.target.value as QuickFiltersState['sortBy'])}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="incident-id">Incident ID</option>
          <option value="status">Status</option>
        </select>
      </div>
    </div>
  );
}
