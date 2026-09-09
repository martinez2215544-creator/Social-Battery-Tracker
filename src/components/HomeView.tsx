import React, { useState } from 'react';
import { SocialEvent, UserPresence, Announcement } from '../types';
import { CircularBatteryGauge } from './CircularBatteryGauge';

interface HomeViewProps {
  energyPercentage: number;
  events: SocialEvent[];
  announcements?: Announcement[];
  onNavigateToLogs: () => void;
  onNavigateToRecharge: () => void;
  onSelectEvent: (event: SocialEvent) => void;
  onAIControlBatteryFromPrompt?: (promptText: string) => Promise<{
    success: boolean;
    event?: SocialEvent;
    delta?: number;
    oldEnergy?: number;
    newEnergy?: number;
    rationale?: string;
    error?: string;
  }>;
  presence?: UserPresence;
  onUpdatePresence?: (presence: UserPresence) => void;
  isQuickAccess?: boolean;
  onPromptRegister?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  energyPercentage,
  events,
  announcements = [],
  onNavigateToLogs,
  onNavigateToRecharge,
  onSelectEvent: _onSelectEvent,
  onAIControlBatteryFromPrompt,
  presence = 'active',
  onUpdatePresence,
  isQuickAccess = false,
  onPromptRegister,
}) => {
  // Simple AI Activity Prompt State
  const [promptInput, setPromptInput] = useState('');
  const [isPredicting, setIsPredicting] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [lastPredictionResult, setLastPredictionResult] = useState<{
    event: SocialEvent;
    oldEnergy: number;
    newEnergy: number;
    delta: number;
    rationale: string;
  } | null>(null);

  const handleRunAIPrediction = async (customPrompt?: string) => {
    const textToRun = customPrompt || promptInput;
    if (!textToRun.trim() || isPredicting) return;

    if (!onAIControlBatteryFromPrompt) {
      onNavigateToLogs();
      return;
    }

    setIsPredicting(true);
    setPromptError(null);

    try {
      const res = await onAIControlBatteryFromPrompt(textToRun);
      if (res.success && res.event && res.oldEnergy !== undefined && res.newEnergy !== undefined && res.delta !== undefined) {
        setLastPredictionResult({
          event: res.event,
          oldEnergy: res.oldEnergy,
          newEnergy: res.newEnergy,
          delta: res.delta,
          rationale: res.rationale || 'AI calculated the exact energy consumption for this activity.',
        });
        setPromptInput('');
      } else if (res.error) {
        setPromptError(res.error);
      }
    } catch (err: any) {
      console.error('AI Prediction Error:', err);
      setPromptError('Failed to calculate activity percentage. Please try again.');
    } finally {
      setIsPredicting(false);
    }
  };

  const activeAnnouncements = announcements.filter((a) => a.active !== false);

  return (
    <main className="pt-20 md:pt-28 pb-28 md:pb-12 px-4 md:px-8 max-w-4xl mx-auto space-y-8">
      {/* Quick Access Notification Banner */}
      {isQuickAccess && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-300 shrink-0">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-amber-300">Quick Access Trial</span>
                <span className="text-[10px] font-mono-tag uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-200">
                  1 Event Limit
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                Prompt an activity to calculate its battery drain percentage. Register for an account for unlimited logs.
              </p>
            </div>
          </div>
          {onPromptRegister && (
            <button
              onClick={onPromptRegister}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 text-black font-bold text-xs shadow-md shrink-0 cursor-pointer hover:opacity-95 active:scale-95 transition-all"
            >
              Register for Full Access
            </button>
          )}
        </div>
      )}

      {/* Admin Broadcast Banner if active */}
      {activeAnnouncements.length > 0 && (
        <div className="space-y-3">
          {activeAnnouncements.slice(0, 2).map((ann) => (
            <div
              key={ann.id}
              className={`rounded-2xl p-4 border flex items-start justify-between gap-4 shadow-lg ${
                ann.type === 'advisory'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : ann.type === 'tip'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-[#528dff]/10 border-[#528dff]/30 text-[#dee2f2]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-2xl text-amber-300 shrink-0 mt-0.5">
                  campaign
                </span>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#dee2f2]">{ann.title}</span>
                    <span className="text-[10px] font-mono-tag uppercase px-1.5 py-0.5 rounded bg-white/10 text-[#afc6ff]">
                      Official Broadcast
                    </span>
                  </div>
                  <p className="text-xs text-[#c2c6d7] leading-relaxed">{ann.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Presence Status Banner if Away or DND */}
      {presence === 'dnd' && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-rose-300">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-rose-400">
              do_not_disturb_on
            </span>
            <div>
              <p className="font-bold text-sm">Do Not Disturb Mode Active</p>
              <p className="text-xs text-rose-200/80">
                You are resting in quiet mode. Social notifications are muted.
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpdatePresence && onUpdatePresence('active')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 transition-all border border-rose-500/30 shrink-0 cursor-pointer"
          >
            Set Active
          </button>
        </div>
      )}

      {presence === 'away' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 text-amber-300">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-amber-400">
              schedule
            </span>
            <div>
              <p className="font-bold text-sm">Away Mode Active</p>
              <p className="text-xs text-amber-200/80">
                Taking a brief breather to rest social energy.
              </p>
            </div>
          </div>
          <button
            onClick={() => onUpdatePresence && onUpdatePresence('active')}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 transition-all border border-amber-500/30 shrink-0 cursor-pointer"
          >
            Set Active
          </button>
        </div>
      )}

      {/* Battery Gauge Section */}
      <section className="flex flex-col items-center justify-center space-y-4">
        <CircularBatteryGauge percentage={energyPercentage} />

        {/* Battery Status Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#131620]/90 border border-white/10 shadow-sm text-xs text-[#c2c6d7]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono-tag text-[11px] tracking-wide">
            Social Energy Gauge • Restore via Recharge Hub
          </span>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md pt-1">
          <button
            onClick={onNavigateToRecharge}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-400 hover:opacity-95 text-black font-bold text-sm md:text-base rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">bolt</span>
            <span>Boost Battery Percentage</span>
          </button>

          <button
            onClick={onNavigateToLogs}
            className="flex-1 border border-[#afc6ff]/40 hover:bg-[#afc6ff]/10 text-[#afc6ff] font-semibold text-sm md:text-base rounded-xl py-3.5 px-4 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer bg-[#171b27]"
          >
            <span className="material-symbols-outlined text-xl">history</span>
            <span>View Event Logs ({events.length})</span>
          </button>
        </div>
      </section>

      {/* Simple AI Activity Energy Predictor */}
      <section className="glass-panel rounded-3xl p-5 md:p-7 border border-[#528dff]/30 bg-gradient-to-b from-[#1b2234] to-[#171b27] shadow-2xl relative overflow-hidden space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#528dff] animate-pulse" />
            <span className="font-mono-tag text-xs uppercase tracking-wider text-[#afc6ff] font-bold">
              AI Activity Energy Predictor
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-[#dee2f2]">
            What activity are you doing?
          </h2>
          <p className="text-xs md:text-sm text-[#c2c6d7]">
            Type any specific activity to calculate the exact percentage deducted or restored to your social battery.
          </p>
        </div>

        {/* Prompt Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleRunAIPrediction();
          }}
          className="space-y-3"
        >
          <div className="relative flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#afc6ff] text-xl">
                edit_note
              </span>
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder='e.g. "Going to a 2-hour dinner party with 6 friends"'
                disabled={isPredicting}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#131620] border border-[#424754]/50 focus:border-[#afc6ff] focus:ring-2 focus:ring-[#528dff]/40 text-sm md:text-base text-[#dee2f2] placeholder:text-[#c2c6d7]/40 outline-none transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isPredicting || !promptInput.trim()}
              className="bg-gradient-to-r from-[#528dff] to-[#afc6ff] hover:opacity-95 disabled:opacity-50 text-[#00275f] font-bold text-sm md:text-base px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#528dff]/25 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              {isPredicting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#00275f] border-t-transparent rounded-full animate-spin" />
                  <span>Calculating %...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">auto_awesome</span>
                  <span>Calculate &amp; Apply %</span>
                </>
              )}
            </button>
          </div>

          {promptError && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{promptError}</span>
            </div>
          )}
        </form>

        {/* Prediction Result Display */}
        {lastPredictionResult && (
          <div className="p-4 md:p-5 rounded-2xl bg-[#131620] border border-[#528dff]/40 shadow-inner space-y-3 animate-fadeIn mt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-emerald-400">check_circle</span>
                <h3 className="font-bold text-sm md:text-base text-[#dee2f2]">
                  {lastPredictionResult.delta < 0
                    ? `Consumes ${Math.abs(lastPredictionResult.delta)}% Social Battery`
                    : `Restores ${lastPredictionResult.delta}% Social Battery`}
                </h3>
              </div>

              {/* Delta change display */}
              <div className="flex items-center gap-2 font-mono-tag font-bold text-sm">
                <span className="text-[#c2c6d7]">{lastPredictionResult.oldEnergy}%</span>
                <span className="material-symbols-outlined text-xs text-[#afc6ff]">arrow_forward</span>
                <span className="text-white bg-[#528dff]/30 px-2 py-0.5 rounded border border-[#afc6ff]/40">
                  {lastPredictionResult.newEnergy}%
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-extrabold ${
                    lastPredictionResult.delta < 0
                      ? 'bg-[#93000a]/40 text-[#ffb4ab] border border-[#ffb4ab]/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {lastPredictionResult.delta > 0
                    ? `+${lastPredictionResult.delta}%`
                    : `${lastPredictionResult.delta}%`}
                </span>
              </div>
            </div>

            <p className="text-xs md:text-sm text-[#c2c6d7] italic leading-relaxed">
              "{lastPredictionResult.rationale}"
            </p>

            {/* Factor breakdown preview */}
            {lastPredictionResult.event.aiAnalysis?.breakdown && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {lastPredictionResult.event.aiAnalysis.breakdown.map((f, idx) => (
                  <div
                    key={idx}
                    className="bg-[#1b1f2b] p-2.5 rounded-xl border border-white/5 text-xs flex justify-between items-center"
                  >
                    <span className="text-[#dee2f2] truncate pr-1 font-medium">{f.factor}</span>
                    <span
                      className={`font-mono-tag font-bold shrink-0 ${
                        f.impact < 0 ? 'text-[#ffb4ab]' : 'text-emerald-300'
                      }`}
                    >
                      {f.impact > 0 ? `+${f.impact}%` : `${f.impact}%`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={onNavigateToLogs}
                className="text-xs text-[#afc6ff] hover:text-white font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View in Event Logs</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
              <button
                type="button"
                onClick={() => setLastPredictionResult(null)}
                className="text-xs text-[#c2c6d7] hover:text-white cursor-pointer transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
