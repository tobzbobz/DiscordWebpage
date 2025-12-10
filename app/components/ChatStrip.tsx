import React, { useState } from 'react';
import ChatWidget from './ChatWidget';

interface ChatStripProps {
  discordId: string;
  callsign: string;
  incidentId: string;
  patientLetter?: string;
  collaborators?: { discordId: string; callsign: string }[];
}

export default function ChatStrip({ discordId, callsign, incidentId, patientLetter = '', collaborators = [] }: ChatStripProps) {
  const [activeTab, setActiveTab] = useState<'incident' | 'patient'>('incident');

  return (
    <div className="fixed top-0 left-0 h-full w-96 bg-slate-800 border-r-4 border-blue-600 shadow-2xl z-50 flex flex-col">
      {/* Tabs */}
      <div className="flex gap-2 p-3 bg-slate-900 border-b border-slate-700">
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${activeTab === 'incident' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          onClick={() => setActiveTab('incident')}
        >
          Incident
        </button>
        <button
          className={`px-4 py-2 rounded-t-lg font-semibold transition-colors ${activeTab === 'patient' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}
          onClick={() => setActiveTab('patient')}
        >
          Patient
        </button>
      </div>
      {/* ChatWidget for selected tab */}
      <div className="flex-1 flex flex-col justify-end overflow-y-auto">
        <ChatWidget
          discordId={discordId}
          callsign={callsign}
          incidentId={incidentId}
          patientLetter={patientLetter}
          chatType={activeTab}
          collaborators={collaborators}
          isOpen={true}
        />
      </div>
    </div>
  );
}
