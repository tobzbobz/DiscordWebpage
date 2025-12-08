'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getVersionHistory,
  getVersion,
  restoreVersion,
  type VersionHistoryEntry
} from '../utils/apiClient';

interface VersionHistoryModalProps {
  discordId: string;
  callsign: string;
  incidentId: string;
  patientLetter?: string;
  sectionName?: string;
  isOwner: boolean;
  isPatientOwner: boolean;
  onClose: () => void;
  onRestore?: (restoredData: any, sectionName: string) => void;
}

export default function VersionHistoryModal({
  discordId,
  callsign,
  incidentId,
  patientLetter = '',
  sectionName,
  isOwner,
  isPatientOwner,
  onClose,
  onRestore
}: VersionHistoryModalProps) {
  const [history, setHistory] = useState<VersionHistoryEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<VersionHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'diff' | 'preview'>('list');
  const [filterSection, setFilterSection] = useState(sectionName || '');

  // Load version history
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const entries = await getVersionHistory(
        discordId,
        incidentId,
        filterSection || undefined,
        patientLetter || undefined
      );
      setHistory(entries);
    } catch (error) {
      console.error('Error loading version history:', error);
    }
    setLoading(false);
  }, [discordId, incidentId, filterSection, patientLetter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Load specific version details
  const handleSelectVersion = async (entry: VersionHistoryEntry) => {
    const fullVersion = await getVersion(discordId, entry.id);
    setSelectedVersion(fullVersion);
    setViewMode('diff');
  };

  // Handle restore
  const handleRestore = async () => {
    if (!selectedVersion) return;

    // Check permissions
    const isPatientSection = ['patient-info', 'hx-complaint', 'past-medical-history', 'vital-obs', 'primary-survey', 'interventions', 'medications', 'clinical-impression'].includes(selectedVersion.sectionName);
    
    if (!isOwner && !(isPatientOwner && isPatientSection)) {
      alert('You do not have permission to restore this version.');
      return;
    }

    if (!confirm('Are you sure you want to restore this version? This will overwrite the current data.')) {
      return;
    }

    setRestoring(true);
    try {
      const result = await restoreVersion(discordId, callsign, selectedVersion.id);
      if (result.success) {
        onRestore?.(result.restoredData, selectedVersion.sectionName);
        alert('Version restored successfully!');
        onClose();
      } else {
        alert('Failed to restore version.');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Error restoring version.');
    }
    setRestoring(false);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Render diff view
  const renderDiff = (prev: any, curr: any, path: string = '') => {
    if (typeof prev !== typeof curr) {
      return (
        <div className="pl-4 border-l-2 border-yellow-500/50 mb-2">
          <span className="text-yellow-400">{path || 'value'}</span>
          <div className="grid grid-cols-2 gap-4 mt-1">
            <div className="bg-red-900/30 rounded p-2 text-red-300 text-sm">
              <span className="text-xs text-red-400 block mb-1">Previous:</span>
              {JSON.stringify(prev, null, 2)}
            </div>
            <div className="bg-green-900/30 rounded p-2 text-green-300 text-sm">
              <span className="text-xs text-green-400 block mb-1">Current:</span>
              {JSON.stringify(curr, null, 2)}
            </div>
          </div>
        </div>
      );
    }

    if (typeof prev === 'object' && prev !== null && curr !== null) {
      const allKeys = new Set([...Object.keys(prev || {}), ...Object.keys(curr || {})]);
      const diffs: React.ReactNode[] = [];

      allKeys.forEach(key => {
        const prevVal = prev?.[key];
        const currVal = curr?.[key];
        
        if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
          diffs.push(
            <div key={key}>
              {renderDiff(prevVal, currVal, key)}
            </div>
          );
        }
      });

      return diffs.length > 0 ? <>{diffs}</> : null;
    }

    if (prev !== curr) {
      return (
        <div className="mb-3 p-3 bg-slate-700/50 rounded-lg">
          <span className="text-blue-400 font-medium block mb-2">{path || 'value'}</span>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-900/30 rounded p-2">
              <span className="text-xs text-red-400 block mb-1">Previous</span>
              <span className="text-red-300 text-sm">{String(prev ?? '(empty)')}</span>
            </div>
            <div className="bg-green-900/30 rounded p-2">
              <span className="text-xs text-green-400 block mb-1">New</span>
              <span className="text-green-300 text-sm">{String(curr ?? '(empty)')}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // Section display names
  const sectionNames: Record<string, string> = {
    'incident': 'Incident Details',
    'patient-info': 'Patient Information',
    'hx-complaint': 'History & Chief Complaint',
    'past-medical-history': 'Past Medical History',
    'vital-obs': 'Vital Signs & Observations',
    'primary-survey': 'Primary Survey',
    'interventions': 'Interventions',
    'medications': 'Medications',
    'clinical-impression': 'Clinical Impression'
  };

  // Get unique sections from history
  const sections = Array.from(new Set(history.map(h => h.sectionName)));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Version History
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Incident {incidentId}{patientLetter ? ` • Patient ${patientLetter}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-700/50 flex gap-4 items-center">
          <label className="text-sm text-slate-400">Filter by section:</label>
          <select
            value={filterSection}
            onChange={(e) => setFilterSection(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All sections</option>
            {sections.map(section => (
              <option key={section} value={section}>
                {sectionNames[section] || section}
              </option>
            ))}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Version List */}
          <div className={`${selectedVersion ? 'w-1/3 border-r border-slate-700' : 'w-full'} overflow-y-auto`}>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                <p className="text-slate-400 mt-2">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <p className="text-4xl mb-2">📋</p>
                <p>No version history found</p>
                <p className="text-sm mt-1">Changes will be tracked when you save</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => handleSelectVersion(entry)}
                    className={`p-4 cursor-pointer hover:bg-slate-700/30 transition-colors ${
                      selectedVersion?.id === entry.id ? 'bg-slate-700/50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-white font-medium">
                          {sectionNames[entry.sectionName] || entry.sectionName}
                        </p>
                        <p className="text-sm text-slate-400 mt-1">
                          by {entry.changedByCallsign}
                        </p>
                        {entry.changeSummary && (
                          <p className="text-sm text-slate-500 mt-1 italic">
                            {entry.changeSummary}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">
                          {formatRelativeTime(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Version Details */}
          {selectedVersion && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">
                    {sectionNames[selectedVersion.sectionName] || selectedVersion.sectionName}
                  </h3>
                  <p className="text-sm text-slate-400">
                    Changed by {selectedVersion.changedByCallsign} • {formatDate(selectedVersion.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('diff')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      viewMode === 'diff' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Diff View
                  </button>
                  <button
                    onClick={() => setViewMode('preview')}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      viewMode === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {viewMode === 'diff' ? (
                <div className="space-y-2">
                  {selectedVersion.diffData ? (
                    Object.keys(selectedVersion.diffData).map(key => (
                      <div key={key}>
                        {renderDiff(
                          selectedVersion.previousData?.[key],
                          selectedVersion.newData?.[key],
                          key
                        )}
                      </div>
                    ))
                  ) : (
                    renderDiff(selectedVersion.previousData, selectedVersion.newData)
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-red-400 mb-2">Previous Version</h4>
                    <pre className="bg-slate-900 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">
                      {JSON.stringify(selectedVersion.previousData, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-green-400 mb-2">New Version</h4>
                    <pre className="bg-slate-900 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto">
                      {JSON.stringify(selectedVersion.newData, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Restore button */}
              {(isOwner || isPatientOwner) && (
                <div className="mt-6 pt-4 border-t border-slate-700">
                  <button
                    onClick={handleRestore}
                    disabled={restoring}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-slate-600 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    {restoring ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Restoring...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Restore This Version
                      </>
                    )}
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    This will overwrite current data with the previous version
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
