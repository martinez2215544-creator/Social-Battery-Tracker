import React, { useState } from 'react';
import { SocialEvent } from '../types';
import { computeAIPercentage } from '../lib/aiService';

interface EventDetailViewProps {
  event: SocialEvent;
  onBack: () => void;
  onUpdateEvent: (updated: SocialEvent) => void;
  onDeleteEvent: (id: string) => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({
  event,
  onBack,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(event.name);
  const [iconName, setIconName] = useState(event.iconName || 'restaurant');
  const [energyImpact, setEnergyImpact] = useState(event.energyImpact);
  const [notes, setNotes] = useState(event.notes || '');
  const [mood, setMood] = useState(event.mood);
  const [durationHours, setDurationHours] = useState(event.durationHours || 2);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const availableIcons = [
    { name: 'restaurant', label: 'Dining' },
    { name: 'coffee', label: 'Coffee' },
    { name: 'local_bar', label: 'Bar' },
    { name: 'groups', label: 'Group' },
    { name: 'work', label: 'Work' },
    { name: 'self_improvement', label: 'Zen' },
    { name: 'bedtime', label: 'Rest' },
    { name: 'sports_esports', label: 'Gaming' },
    { name: 'fitness_center', label: 'Gym' },
    { name: 'directions_run', label: 'Run' },
    { name: 'flight', label: 'Travel' },
    { name: 'music_note', label: 'Music' },
    { name: 'movie', label: 'Movie' },
    { name: 'pets', label: 'Pets' },
    { name: 'spa', label: 'Spa' },
    { name: 'shopping_bag', label: 'Shop' },
    { name: 'home', label: 'Home' },
    { name: 'chat', label: 'Chat' },
  ];

  // AI Recalibration in Edit Modal
  const handleRecalculateWithAI = async () => {
    setIsRecalculating(true);
    try {
      const result = await computeAIPercentage({
        name,
        type: event.type,
        durationHours,
        notes,
      });

      setEnergyImpact(result.energyImpact);
      if (result.mood) setMood(result.mood);
      if (result.iconName) setIconName(result.iconName);
    } catch (err) {
      console.error('Recalculation error:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateEvent({
      ...event,
      name,
      iconName,
      durationHours,
      energyImpact,
      notes,
      mood,
      impactLabel:
        energyImpact <= -50
          ? 'Significant drain'
          : energyImpact < 0
          ? 'Moderate drain'
          : energyImpact === 0
          ? 'Neutral impact'
          : 'Restorative boost',
    });
    setIsEditing(false);
  };

  const isDrain = event.energyImpact < 0;

  return (
    <main className="pt-20 md:pt-28 pb-32 px-4 md:px-16 max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-mono-tag uppercase text-[#c2c6d7] hover:text-[#afc6ff] transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">arrow_back</span>
        <span>Back to Timeline</span>
      </button>

      {/* Hero Card */}
      <section className="bg-[#1b1f2b]/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/5 relative overflow-hidden group shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#528dff]/10 to-[#a9c7ff]/10 opacity-50 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center space-y-3">
          {/* Icon */}
          <div className="h-16 w-16 bg-[#252a36] rounded-full flex items-center justify-center mb-1 shadow-inner border border-white/5">
            <span
              className="material-symbols-outlined text-3xl text-[#a9c7ff]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {event.iconName || 'restaurant'}
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-[#dee2f2]">
            {event.name}
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
            <span className="px-3 py-1 bg-[#252a36] rounded-full font-mono-tag text-xs text-[#c2c6d7] uppercase tracking-wider">
              {event.categoryLabel || event.type.toUpperCase()}
            </span>
            <span className="px-3 py-1 bg-[#252a36] rounded-full font-mono-tag text-xs text-[#c2c6d7] uppercase tracking-wider">
              {event.displayTime}
            </span>
            {event.isAiComputed && (
              <span className="px-3 py-1 bg-[#528dff]/20 border border-[#afc6ff]/30 text-[#afc6ff] rounded-full font-mono-tag text-xs uppercase tracking-wider flex items-center gap-1 font-bold">
                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                AI Computed
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Bento Grid Details */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Duration Card */}
        <div className="glass-panel bg-[#171b27]/40 rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2 text-[#c2c6d7] mb-3">
            <span className="material-symbols-outlined text-sm">schedule</span>
            <span className="font-mono-tag text-xs uppercase tracking-wider">Duration</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#dee2f2]">{event.durationHours} hours</p>
            <p className="text-sm text-[#c2c6d7]/70 mt-1">{event.durationLabel || 'Standard session'}</p>
          </div>
        </div>

        {/* Energy Impact Card */}
        <div className="glass-panel bg-[#171b27]/40 rounded-2xl p-5 flex flex-col justify-between min-h-[140px] relative overflow-hidden">
          <div className="flex items-center gap-2 text-[#afc6ff] mb-3">
            <span className="material-symbols-outlined text-sm">battery_2_bar</span>
            <span className="font-mono-tag text-xs uppercase tracking-wider">Energy Impact</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className={`text-3xl font-bold ${isDrain ? 'text-[#ffb4ab]' : 'text-[#afc6ff]'}`}>
              {event.energyImpact > 0 ? `+${event.energyImpact}` : event.energyImpact}%
            </p>
          </div>
          <p className="text-sm text-[#c2c6d7]/70 mt-1">{event.impactLabel || 'Measured impact'}</p>

          {/* Progress Bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#252a36]">
            <div
              className={`h-full bg-gradient-to-r ${
                isDrain ? 'from-[#93000a] to-[#ffb4ab]' : 'from-[#528dff] to-[#afc6ff]'
              }`}
              style={{ width: `${Math.min(100, Math.abs(event.energyImpact))}%` }}
            />
          </div>
        </div>

        {/* Mood Card */}
        <div className="glass-panel bg-[#171b27]/40 rounded-2xl p-5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2 text-[#a9c7ff] mb-3">
            <span className="material-symbols-outlined text-sm">mood</span>
            <span className="font-mono-tag text-xs uppercase tracking-wider">Mood</span>
          </div>
          <p className="text-xl font-bold text-[#a9c7ff]">{event.mood}</p>
        </div>
      </section>

      {/* AI Factor Decomposition Section if available */}
      {event.aiAnalysis && (
        <section className="glass-panel bg-[#171b27]/60 rounded-3xl p-6 md:p-8 space-y-4 border border-[#528dff]/30 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#afc6ff] text-2xl">insights</span>
              <h2 className="text-xl font-bold text-[#dee2f2]">AI Percentage Factor Decomposition</h2>
            </div>
            <span className="font-mono-tag text-xs px-2.5 py-1 rounded-full bg-[#528dff]/20 text-[#afc6ff]">
              Neuro-Social Model
            </span>
          </div>

          {/* Factor list */}
          {event.aiAnalysis.breakdown && event.aiAnalysis.breakdown.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {event.aiAnalysis.breakdown.map((item, idx) => (
                <div key={idx} className="bg-[#1b1f2b] p-3.5 rounded-2xl border border-white/5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm text-[#dee2f2]">{item.factor}</span>
                    <span
                      className={`font-mono-tag font-bold text-sm ${
                        item.impact < 0 ? 'text-[#ffb4ab]' : 'text-emerald-300'
                      }`}
                    >
                      {item.impact > 0 ? `+${item.impact}%` : `${item.impact}%`}
                    </span>
                  </div>
                  <p className="text-xs text-[#c2c6d7]/80 leading-relaxed">{item.rationale}</p>
                </div>
              ))}
            </div>
          )}

          {/* AI Rationale */}
          {event.aiAnalysis.aiRationale && (
            <div className="bg-[#1b1f2b]/80 p-4 rounded-2xl border border-white/5 space-y-1 mt-3">
              <span className="font-mono-tag text-[10px] uppercase tracking-wider text-[#afc6ff] font-bold">
                AI Psychological Analysis
              </span>
              <p className="text-xs md:text-sm text-[#c2c6d7] italic leading-relaxed">
                "{event.aiAnalysis.aiRationale}"
              </p>
            </div>
          )}

          {/* AI Recharge Recommendation */}
          {event.aiAnalysis.rechargeRecommendation && (
            <div className="bg-[#528dff]/10 p-4 rounded-2xl border border-[#528dff]/30 flex items-start gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-xl mt-0.5">spa</span>
              <div>
                <span className="font-bold text-xs uppercase text-emerald-300 tracking-wider">
                  Recommended Recovery Strategy:
                </span>
                <p className="text-xs md:text-sm text-[#dee2f2] mt-0.5 leading-relaxed">
                  {event.aiAnalysis.rechargeRecommendation}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Reflection Notes Section */}
      <section className="glass-panel bg-[#171b27]/30 rounded-3xl p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[#528dff]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#afc6ff] text-base">edit_note</span>
          </div>
          <h2 className="text-xl font-semibold text-[#dee2f2]">Reflection Notes</h2>
        </div>

        {event.notes ? (
          <blockquote className="text-base text-[#c2c6d7] leading-relaxed pl-3 md:pl-6 border-l-2 border-[#afc6ff]/40 italic">
            "{event.notes}"
          </blockquote>
        ) : (
          <p className="text-sm text-[#c2c6d7]/60 italic pl-3">
            No reflection notes added for this event.
          </p>
        )}
      </section>

      {/* Action Buttons */}
      <section className="flex flex-wrap justify-center gap-4 pt-4">
        <button
          onClick={() => setIsEditing(true)}
          className="bg-[#afc6ff] hover:bg-[#d9e2ff] text-[#002d6d] font-semibold px-8 py-3.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-[#afc6ff]/20 cursor-pointer"
        >
          <span className="material-symbols-outlined">edit</span>
          <span>Edit Log</span>
        </button>

        <button
          onClick={() => onDeleteEvent(event.id)}
          className="border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#93000a]/20 px-6 py-3.5 rounded-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined">delete</span>
          <span>Delete</span>
        </button>
      </section>

      {/* Edit Modal */}
      {isEditing ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel bg-[#171b27] border border-[#424754]/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#dee2f2]">Edit Social Log</h3>
              <button onClick={() => setIsEditing(false)} className="text-[#c2c6d7]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="font-mono-tag text-xs uppercase text-[#c2c6d7] block mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-2 text-sm text-[#dee2f2]"
                  required
                />
              </div>

              <div>
                <label className="font-mono-tag text-xs uppercase text-[#c2c6d7] block mb-1">
                  Activity Icon
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 bg-[#1b1f2b] p-2.5 rounded-xl border border-[#424754]/40">
                  {availableIcons.map((ic) => (
                    <button
                      key={ic.name}
                      type="button"
                      onClick={() => setIconName(ic.name)}
                      title={ic.label}
                      className={`p-2 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                        iconName === ic.name
                          ? 'bg-[#528dff]/30 border border-[#afc6ff] text-[#afc6ff]'
                          : 'bg-[#252a36] hover:bg-[#2e3444] text-[#c2c6d7]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-lg">{ic.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recalculate with AI Button */}
              <button
                type="button"
                disabled={isRecalculating}
                onClick={handleRecalculateWithAI}
                className="w-full py-2 px-3 rounded-xl bg-[#528dff]/20 text-[#afc6ff] border border-[#afc6ff]/30 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[#528dff]/30 transition-all"
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <span>{isRecalculating ? 'Recalculating...' : 'Recalculate Percentage with AI'}</span>
              </button>

              <div>
                <label className="font-mono-tag text-xs uppercase text-[#c2c6d7] block mb-1">
                  Energy Impact ({energyImpact}%)
                </label>
                <input
                  type="range"
                  min="-100"
                  max="100"
                  value={energyImpact}
                  onChange={(e) => setEnergyImpact(Number(e.target.value))}
                  className="w-full cursor-pointer"
                />
              </div>

              <div>
                <label className="font-mono-tag text-xs uppercase text-[#c2c6d7] block mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-2 text-sm text-[#dee2f2] resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#c2c6d7]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#afc6ff] text-[#002d6d]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
};
