import React, { useState } from 'react';
import { BurnoutEntry } from '../types';

interface BurnoutViewProps {
  burnoutLogs: BurnoutEntry[];
  onAddBurnoutLog: (entry: Omit<BurnoutEntry, 'id'>) => void;
  onDeleteBurnoutLog: (id: string) => void;
  isQuickAccess?: boolean;
  onPromptRegister?: () => void;
}

export const BurnoutView: React.FC<BurnoutViewProps> = ({
  burnoutLogs,
  onAddBurnoutLog,
  onDeleteBurnoutLog,
  isQuickAccess = false,
  onPromptRegister,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [reflection, setReflection] = useState('');
  const [dateStr, setDateStr] = useState(
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isQuickAccess) {
      if (onPromptRegister) onPromptRegister();
      return;
    }
    if (!title.trim() || !reflection.trim()) return;

    onAddBurnoutLog({
      title: title.trim(),
      reflection: reflection.trim(),
      date: dateStr,
      isoDate: new Date().toISOString()
    });

    setTitle('');
    setReflection('');
    setShowAddModal(false);
  };

  // Locked View for Quick Access Mode
  if (isQuickAccess) {
    return (
      <main className="pt-20 md:pt-28 pb-32 md:pb-12 px-4 md:px-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
        {/* Quick Access Notification Header */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
              <span className="material-symbols-outlined text-2xl">lock</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-amber-300">Quiet Room &amp; Burnout Locked</span>
                <span className="text-[10px] font-mono-tag uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200">
                  Quick Access Trial
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                The Quiet Room is under Burnout. Users must register for an account to unlock and access this feature.
              </p>
            </div>
          </div>
          {onPromptRegister && (
            <button
              type="button"
              onClick={onPromptRegister}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 text-black font-bold text-xs shadow-md shrink-0 cursor-pointer hover:opacity-95 active:scale-95 transition-all"
            >
              Register Account
            </button>
          )}
        </div>

        {/* Locked Central Card */}
        <div className="glass-panel bg-[#0e131e]/90 border border-amber-500/30 rounded-3xl p-8 md:p-12 text-center flex flex-col items-center space-y-6 shadow-2xl relative overflow-hidden">
          {/* Glowing accent */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-[#528dff]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Large Lock & Mode Night Icon */}
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-[#171b27] border-2 border-amber-500/40 flex items-center justify-center shadow-xl shadow-amber-500/10">
              <span className="material-symbols-outlined text-amber-400 text-5xl animate-pulse">
                lock
              </span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-[#29497a] border border-[#afc6ff]/40 flex items-center justify-center text-[#afc6ff] shadow-md">
              <span className="material-symbols-outlined text-base">mode_night</span>
            </div>
          </div>

          {/* Titles */}
          <div className="space-y-2 max-w-lg">
            <h1 className="text-2xl md:text-3xl font-bold text-[#dee2f2]">
              The Quiet Room &amp; Burnout Logs are Locked
            </h1>
            <p className="text-xs sm:text-sm text-[#c2c6d7] leading-relaxed">
              In Quick Access Mode, the Quiet Room is locked. Please create a free account or sign in to log quiet reflections, establish emotional boundaries, and access the guided breathing sanctuary.
            </p>
          </div>

          {/* Feature Highlights Grid */}
          <div className="w-full max-w-md bg-[#171b27]/80 border border-white/5 rounded-2xl p-4 text-left text-xs space-y-2.5">
            <div className="flex items-center gap-2.5 text-[#afc6ff] font-medium">
              <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
              <span>Quiet Room breathing loops and ambient relaxation audio</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#afc6ff] font-medium">
              <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
              <span>Burnout moment reflections and boundary logs</span>
            </div>
            <div className="flex items-center gap-2.5 text-[#afc6ff] font-medium">
              <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
              <span>Cloud Firestore data persistence &amp; multi-device sync</span>
            </div>
          </div>

          {/* Action Button */}
          {onPromptRegister && (
            <button
              type="button"
              onClick={onPromptRegister}
              className="w-full max-w-md bg-gradient-to-r from-amber-500 to-amber-300 hover:opacity-95 text-black font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-base">how_to_reg</span>
              <span>Register to Unlock Burnout &amp; Quiet Room</span>
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="pt-20 md:pt-28 pb-32 md:pb-12 px-4 md:px-8 max-w-4xl mx-auto space-y-10">
      {/* Header Section */}
      <section className="flex flex-col items-center text-center gap-3 max-w-2xl mx-auto">
        <div className="w-16 h-16 rounded-full bg-[#303541]/60 flex items-center justify-center mb-2 text-[#afc6ff] shadow-inner shadow-white/5">
          <span
            className="material-symbols-outlined text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            mode_night
          </span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-[#dee2f2] tracking-tight">
          The Quiet Room
        </h1>
        <p className="text-base md:text-lg text-[#c2c6d7]">
          Honoring the moments you needed to unplug.
        </p>

        <button
          onClick={() => setShowAddModal(true)}
          className="mt-3 bg-[#29497a] hover:bg-[#528dff] text-[#d9e2ff] font-medium text-sm py-2.5 px-5 rounded-xl border border-[#afc6ff]/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer"
        >
          <span className="material-symbols-outlined text-lg">edit_note</span>
          <span>Add Quiet Reflection</span>
        </button>
      </section>

      {/* Burnout History List */}
      <section className="max-w-3xl mx-auto w-full flex flex-col gap-4">
        {burnoutLogs.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center text-[#c2c6d7]">
            <p>No quiet room entries yet. Log a moment when you felt overwhelmed to track recovery boundaries.</p>
          </div>
        ) : (
          burnoutLogs.map((entry) => (
            <article
              key={entry.id}
              className="glass-panel rounded-2xl p-5 flex flex-col gap-3 group hover:bg-[#171b27] transition-all duration-300 relative"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#afc6ff] text-xl">
                    history_toggle_off
                  </span>
                  <span className="font-mono-tag text-xs text-[#afc6ff] font-semibold">
                    {entry.date}
                  </span>
                </div>

                <button
                  onClick={() => onDeleteBurnoutLog(entry.id)}
                  title="Remove entry"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-[#c2c6d7] hover:text-[#ffb4ab] p-1 rounded-lg"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <h3 className="text-lg md:text-xl font-semibold text-[#dee2f2]">
                  {entry.title}
                </h3>
                <p className="text-base text-[#c2c6d7] leading-relaxed">
                  {entry.reflection}
                </p>
              </div>
            </article>
          ))
        )}
      </section>

      {/* Add Reflection Modal */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel bg-[#171b27] border border-[#424754]/50 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#dee2f2]">Add Quiet Reflection</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#c2c6d7] hover:text-[#dee2f2]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="font-mono-tag text-xs uppercase text-[#c2c6d7] block mb-1">
                  Date Label
                </label>
                <input
                  type="text"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-[#dee2f2]"
                  required
                />
              </div>

              <div>
                <label className="font-mono-tag text-xs uppercase text-[#c2c6d7] block mb-1">
                  Trigger / Moment Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Over-scheduled weekend"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-[#dee2f2]"
                  required
                />
              </div>

              <div>
                <label className="font-mono-tag text-xs uppercase text-[#c2c6d7] block mb-1">
                  Reflection & Boundaries
                </label>
                <textarea
                  rows={3}
                  placeholder="What boundary or solo time do you need to recover?"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  className="w-full bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-2.5 text-sm text-[#dee2f2] resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-[#c2c6d7] hover:bg-[#252a36]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-[#afc6ff] text-[#002d6d] hover:bg-[#d9e2ff]"
                >
                  Save Reflection
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
};
