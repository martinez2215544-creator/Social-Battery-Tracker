import React, { useState } from 'react';
import { SocialEvent } from '../types';

interface EventLogsViewProps {
  events: SocialEvent[];
  onSelectEvent: (event: SocialEvent) => void;
  onDeleteEvent?: (id: string) => void;
  onNavigateToHome: () => void;
  onNavigateToRecharge: () => void;
  isQuickAccess?: boolean;
  onPromptRegister?: () => void;
}

export const EventLogsView: React.FC<EventLogsViewProps> = ({
  events,
  onSelectEvent,
  onDeleteEvent,
  onNavigateToHome,
  onNavigateToRecharge,
  isQuickAccess = false,
  onPromptRegister,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'drains' | 'boosts' | 'social' | 'work' | 'solo'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter events
  const filteredEvents = events.filter((event) => {
    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = event.name.toLowerCase().includes(q);
      const matchNotes = (event.notes || '').toLowerCase().includes(q);
      const matchCategory = (event.categoryLabel || '').toLowerCase().includes(q);
      const matchRationale = (event.aiAnalysis?.aiRationale || '').toLowerCase().includes(q);
      if (!matchName && !matchNotes && !matchCategory && !matchRationale) return false;
    }

    // Category / Impact filters
    if (selectedFilter === 'drains') return event.energyImpact < 0;
    if (selectedFilter === 'boosts') return event.energyImpact > 0;
    if (selectedFilter === 'social') return event.type === 'social';
    if (selectedFilter === 'work') return event.type === 'work';
    if (selectedFilter === 'solo') return event.type === 'solo' || event.type === 'rest';

    return true;
  });

  const totalDrains = events.filter((e) => e.energyImpact < 0).length;
  const totalBoosts = events.filter((e) => e.energyImpact > 0).length;
  const totalDrainPercentage = events
    .filter((e) => e.energyImpact < 0)
    .reduce((acc, e) => acc + Math.abs(e.energyImpact), 0);

  const getIconSymbol = (event: SocialEvent) => {
    if (event.iconName) return event.iconName;
    switch (event.type) {
      case 'social':
        return 'restaurant';
      case 'solo':
        return 'self_improvement';
      case 'work':
        return 'groups';
      case 'rest':
        return 'bedtime';
      default:
        return 'battery_charging_full';
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (onDeleteEvent) {
      onDeleteEvent(id);
    }
  };

  return (
    <main className="pt-20 md:pt-28 pb-28 md:pb-12 px-4 md:px-8 max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <section className="glass-panel rounded-3xl p-6 md:p-8 border border-[#528dff]/30 bg-gradient-to-br from-[#1b2234] via-[#171b27] to-[#0e131e] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#528dff] animate-pulse" />
              <span className="font-mono-tag text-xs uppercase tracking-wider text-[#afc6ff] font-bold">
                Activity Intelligence Archive
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#dee2f2] tracking-tight">
              Event Logs
            </h1>
            <p className="text-xs md:text-sm text-[#c2c6d7] max-w-xl leading-relaxed">
              Complete historical record of activities and energy shifts calculated from your AI prompts and recharge sessions.
            </p>
          </div>

          {/* Aggregate Stats Box */}
          <div className="grid grid-cols-3 gap-2 bg-[#131620]/90 border border-white/5 rounded-2xl p-3 md:p-4 text-center shrink-0 shadow-lg">
            <div className="px-2">
              <span className="text-[10px] font-mono-tag uppercase text-[#c2c6d7] block">Total Logs</span>
              <span className="text-xl md:text-2xl font-black text-white">{events.length}</span>
            </div>
            <div className="px-2 border-x border-white/10">
              <span className="text-[10px] font-mono-tag uppercase text-[#ffb4ab] block">Drains</span>
              <span className="text-xl md:text-2xl font-black text-[#ffb4ab]">{totalDrains}</span>
            </div>
            <div className="px-2">
              <span className="text-[10px] font-mono-tag uppercase text-emerald-300 block">Restores</span>
              <span className="text-xl md:text-2xl font-black text-emerald-300">{totalBoosts}</span>
            </div>
          </div>
        </div>

        {/* Quick Navigation Shortcuts */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 mt-4">
          <button
            onClick={onNavigateToHome}
            className="text-xs bg-gradient-to-r from-[#528dff] to-[#afc6ff] text-[#00275f] font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#528dff]/20 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">edit_note</span>
            <span>Prompt New Activity (Home)</span>
          </button>

          <button
            onClick={onNavigateToRecharge}
            className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">bolt</span>
            <span>Explore Recharge Activities</span>
          </button>
        </div>
      </section>

      {/* Search & Filter Bar */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#c2c6d7] text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logged activities, notes, or AI rationales..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#171b27] border border-white/10 focus:border-[#afc6ff] text-xs md:text-sm text-[#dee2f2] placeholder:text-[#c2c6d7]/50 outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c2c6d7] hover:text-white"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { key: 'all', label: 'All' },
              { key: 'drains', label: 'Drains (-%)' },
              { key: 'boosts', label: 'Restores (+%)' },
              { key: 'social', label: 'Social' },
              { key: 'work', label: 'Work' },
              { key: 'solo', label: 'Solo/Rest' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setSelectedFilter(f.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  selectedFilter === f.key
                    ? 'bg-[#528dff] text-[#00275f] font-bold shadow-md shadow-[#528dff]/20'
                    : 'bg-[#171b27] hover:bg-[#252a36] text-[#c2c6d7] border border-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event Logs List */}
        {filteredEvents.length === 0 ? (
          <div className="glass-panel rounded-3xl p-10 md:p-12 text-center border border-white/5 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#528dff]/10 border border-[#afc6ff]/20 flex items-center justify-center mx-auto text-[#afc6ff]">
              <span className="material-symbols-outlined text-3xl">event_busy</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-lg text-[#dee2f2]">
                {searchQuery ? 'No matching events found' : 'No prompt events recorded yet'}
              </h3>
              <p className="text-xs md:text-sm text-[#c2c6d7] max-w-md mx-auto">
                {searchQuery
                  ? 'Try changing your search terms or filter criteria.'
                  : 'Enter any activity into the AI prompt on the Home page to instantly calculate energy drain and log it here.'}
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={onNavigateToHome}
                className="mt-2 bg-gradient-to-r from-[#528dff] to-[#afc6ff] text-[#00275f] font-bold px-6 py-3 rounded-xl text-sm hover:opacity-95 transition-all cursor-pointer shadow-lg shadow-[#528dff]/20 inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">edit_note</span>
                <span>Go to Home to Prompt Activity</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const isDrain = event.energyImpact < 0;
              const formattedImpact = isDrain
                ? `${event.energyImpact}%`
                : `+${event.energyImpact}%`;

              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className="glass-panel rounded-2xl p-4 md:p-5 border border-white/5 bg-[#171b27]/90 hover:bg-[#1f2536] hover:border-[#afc6ff]/30 transition-all duration-150 cursor-pointer group shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
                >
                  {/* Left: Icon & Meta */}
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isDrain
                          ? 'bg-[#93000a]/25 text-[#ffb4ab] border border-[#ffb4ab]/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {getIconSymbol(event)}
                      </span>
                    </div>

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-[#dee2f2] group-hover:text-[#afc6ff] transition-colors truncate">
                          {event.name}
                        </h3>
                        {event.categoryLabel && (
                          <span className="text-[10px] font-mono-tag uppercase px-2 py-0.5 rounded-full bg-white/5 text-[#c2c6d7] border border-white/5">
                            {event.categoryLabel}
                          </span>
                        )}
                        {event.isAiComputed && (
                          <span className="text-[10px] font-mono-tag px-1.5 py-0.2 rounded bg-[#528dff]/20 text-[#afc6ff] border border-[#afc6ff]/30 flex items-center gap-0.5">
                            <span>✨ AI Computed</span>
                          </span>
                        )}
                      </div>

                      {/* Time & Duration */}
                      <div className="flex items-center gap-3 text-xs text-[#c2c6d7]">
                        <span className="flex items-center gap-1 font-mono-tag">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          <span>{event.displayTime}</span>
                        </span>
                        {event.durationHours ? (
                          <span className="flex items-center gap-1 font-mono-tag text-[#afc6ff]">
                            <span className="material-symbols-outlined text-xs">timer</span>
                            <span>{event.durationHours}h</span>
                          </span>
                        ) : null}
                      </div>

                      {/* AI Rationale Snippet */}
                      {event.aiAnalysis?.aiRationale && (
                        <p className="text-xs text-[#c2c6d7]/80 italic line-clamp-1 mt-1">
                          "{event.aiAnalysis.aiRationale}"
                        </p>
                      )}

                      {/* Factors Breakdown preview */}
                      {event.aiAnalysis?.breakdown && event.aiAnalysis.breakdown.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {event.aiAnalysis.breakdown.slice(0, 3).map((f, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-mono-tag px-2 py-0.5 rounded bg-[#10141e] text-[#c2c6d7] border border-white/5"
                            >
                              {f.factor}: <strong className={f.impact < 0 ? 'text-[#ffb4ab]' : 'text-emerald-300'}>{f.impact > 0 ? `+${f.impact}%` : `${f.impact}%`}</strong>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Percentage & Delete Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                    <div className="text-left md:text-right">
                      <span
                        className={`font-black text-xl md:text-2xl font-mono-tag ${
                          isDrain ? 'text-[#ffb4ab]' : 'text-emerald-300'
                        }`}
                      >
                        {formattedImpact}
                      </span>
                      <p className="text-[10px] font-mono-tag text-[#c2c6d7]">
                        {isDrain ? 'Battery Drain' : 'Battery Boost'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(event);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#afc6ff] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>Details</span>
                        <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      </button>

                      {onDeleteEvent && (
                        <button
                          onClick={(e) => handleDelete(e, event.id)}
                          className="p-2 rounded-xl text-[#c2c6d7] hover:text-[#ffb4ab] hover:bg-[#93000a]/20 transition-all cursor-pointer"
                          title="Delete Event Log"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};
