import React, { useState, useEffect } from 'react';
import { ActivityType, MoodType, SocialEvent, AIEventAnalysis } from '../types';
import { computeAIPercentage, parseNaturalLanguageEvent } from '../lib/aiService';

interface LogEventViewProps {
  currentBattery?: number;
  onAddEvent: (event: Omit<SocialEvent, 'id' | 'timestamp'>) => void;
  onCancel?: () => void;
  isQuickAccess?: boolean;
  quickAccessEventsLogged?: number;
  onPromptRegister?: () => void;
}

export const LogEventView: React.FC<LogEventViewProps> = ({
  currentBattery = 75,
  onAddEvent,
  isQuickAccess = false,
  quickAccessEventsLogged = 0,
  onPromptRegister,
}) => {
  // Mode selection: 'ai_prompt' | 'ai_builder'
  const [logMode, setLogMode] = useState<'ai_prompt' | 'ai_builder'>('ai_prompt');

  // AI Prompt Mode State
  const [nlpPrompt, setNlpPrompt] = useState('');
  const [isComputingNlp, setIsComputingNlp] = useState(false);
  const [nlpError, setNlpError] = useState<string | null>(null);

  // Form & AI Builder State
  const [name, setName] = useState('');
  const [type, setType] = useState<ActivityType>('social');
  const [selectedIcon, setSelectedIcon] = useState<string>('restaurant');
  const [energyImpact, setEnergyImpact] = useState<number>(-25);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [groupSize, setGroupSize] = useState<string>('Medium (3-6 people)');
  const [noiseLevel, setNoiseLevel] = useState<string>('Moderate');
  const [maskingDemand, setMaskingDemand] = useState<string>('Moderate');
  const [familiarity, setFamiliarity] = useState<string>('Casual Friends');
  const [mood, setMood] = useState<MoodType>('Content but Tired');
  const [notes, setNotes] = useState('');

  // AI computation state & analysis
  const [isComputingAI, setIsComputingAI] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIEventAnalysis | null>(null);
  const [isAiGenerated, setIsAiGenerated] = useState(false);

  const isLimitReached = isQuickAccess && quickAccessEventsLogged >= 1;

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

  // Preset Examples
  const promptExamples = [
    'Dinner party with 7 friends at a crowded noisy bistro for 3 hours',
    'Intense 2-hour quarterly roadmap review meeting with executive stakeholders',
    'Quiet 45-minute solo reading session with chamomile tea',
    'Coffee catch-up with my best friend for 1.5 hours in a peaceful park',
    '30-minute guided breathing and meditation in dark room',
  ];

  const handleTypeChange = (newType: ActivityType) => {
    setType(newType);
    const defaultIcons: Record<ActivityType, string> = {
      social: 'restaurant',
      work: 'groups',
      solo: 'self_improvement',
      rest: 'bedtime',
    };
    setSelectedIcon(defaultIcons[newType]);
  };

  // AI Automatic Percentage Computation Trigger
  const handleComputeAIPercentage = async () => {
    setIsComputingAI(true);
    try {
      const result = await computeAIPercentage({
        name: name || (type === 'social' ? 'Social Gathering' : type === 'work' ? 'Work Session' : 'Solo Activity'),
        type,
        durationHours,
        groupSize,
        noiseLevel,
        maskingDemand,
        familiarity,
        notes,
      });

      setEnergyImpact(result.energyImpact);
      if (result.mood) setMood(result.mood);
      if (result.iconName) setSelectedIcon(result.iconName);
      setAiAnalysis(result);
      setIsAiGenerated(true);
    } catch (err) {
      console.error('Failed to compute percentage:', err);
    } finally {
      setIsComputingAI(false);
    }
  };

  // One-Shot AI Natural Language Log Trigger
  const handleProcessNlpPrompt = async (promptText?: string, autoSave: boolean = false) => {
    const textToProcess = promptText || nlpPrompt;
    if (!textToProcess.trim()) return;

    if (autoSave && isLimitReached) {
      if (onPromptRegister) onPromptRegister();
      return;
    }

    setIsComputingNlp(true);
    setNlpError(null);

    try {
      const parsed = await parseNaturalLanguageEvent(textToProcess, currentBattery);
      setName(parsed.name);
      setType(parsed.type);
      setSelectedIcon(parsed.iconName || 'restaurant');
      setDurationHours(parsed.durationHours);
      setEnergyImpact(parsed.energyImpact);
      setMood(parsed.mood);
      setNotes(parsed.notes);
      setAiAnalysis({
        energyImpact: parsed.energyImpact,
        impactLabel: parsed.impactLabel,
        categoryLabel: parsed.categoryLabel,
        aiRationale: parsed.aiRationale,
        breakdown: parsed.breakdown,
        rechargeRecommendation: parsed.rechargeRecommendation,
        recommendedRechargeAmount: parsed.recommendedRechargeAmount,
      });
      setIsAiGenerated(true);

      if (autoSave) {
        onAddEvent({
          name: parsed.name,
          type: parsed.type,
          categoryLabel: parsed.categoryLabel,
          displayTime: 'Just now',
          durationHours: parsed.durationHours,
          durationLabel: parsed.durationLabel,
          energyImpact: parsed.energyImpact,
          impactLabel: parsed.impactLabel,
          mood: parsed.mood,
          notes: parsed.notes,
          iconName: parsed.iconName,
          isAiComputed: true,
          aiAnalysis: {
            energyImpact: parsed.energyImpact,
            impactLabel: parsed.impactLabel,
            categoryLabel: parsed.categoryLabel,
            aiRationale: parsed.aiRationale,
            breakdown: parsed.breakdown,
            rechargeRecommendation: parsed.rechargeRecommendation,
            recommendedRechargeAmount: parsed.recommendedRechargeAmount,
          },
        });
      } else {
        setLogMode('ai_builder');
      }
    } catch (err: any) {
      console.error('AI NLP parse error:', err);
      setNlpError('Failed to parse event. Please try a different wording or configure manually.');
    } finally {
      setIsComputingNlp(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLimitReached) {
      if (onPromptRegister) onPromptRegister();
      return;
    }

    if (!name.trim()) return;

    const categoryLabels: Record<ActivityType, string> = {
      social: 'SOCIAL GATHERING',
      work: 'WORK MEETING',
      solo: 'SOLO RECHARGE',
      rest: 'REST & RESTORATION',
    };

    const impactLabel =
      energyImpact <= -50
        ? 'Significant drain'
        : energyImpact < 0
        ? 'Moderate drain'
        : energyImpact === 0
        ? 'Neutral impact'
        : energyImpact < 50
        ? 'Gentle restore'
        : 'Deep recharge';

    const durationLabel =
      durationHours >= 3
        ? 'Longer than average'
        : durationHours >= 1.5
        ? 'Standard duration'
        : 'Quick session';

    onAddEvent({
      name: name.trim(),
      type,
      categoryLabel: aiAnalysis?.categoryLabel || categoryLabels[type],
      displayTime: 'Just now',
      durationHours,
      durationLabel,
      energyImpact,
      impactLabel: aiAnalysis?.impactLabel || impactLabel,
      mood,
      notes: notes.trim(),
      iconName: selectedIcon,
      isAiComputed: isAiGenerated,
      aiAnalysis: aiAnalysis || undefined,
    });
  };

  const moodOptions: MoodType[] = [
    'Energized',
    'Content',
    'Content but Tired',
    'Tired',
    'Exhausted',
    'Calm & Rested',
  ];

  return (
    <main className="pt-20 md:pt-28 pb-32 md:pb-12 px-4 md:px-0 max-w-2xl mx-auto space-y-6">
      {/* Header Section */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#528dff]/20 border border-[#afc6ff]/40 flex items-center justify-center text-[#afc6ff]">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#dee2f2] tracking-tight">
              AI Percentage Tracker
            </h1>
          </div>
        </div>
        <p className="text-sm md:text-base text-[#c2c6d7]">
          Let AI accurately compute exact battery drain and recharge percentages per social activity.
        </p>
      </section>

      {/* Quick Access Notification Banners */}
      {isQuickAccess && (
        isLimitReached ? (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl text-amber-400 shrink-0 mt-0.5">lock</span>
              <div>
                <h3 className="font-bold text-sm text-amber-300">Quick Access Limit Reached (1/1 Logged)</h3>
                <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                  In Quick Access Mode, you can only register 1 social event. Create an account to log unlimited AI percentage events.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onPromptRegister}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 text-black font-bold text-xs shadow-md shrink-0 cursor-pointer hover:opacity-95 active:scale-95 transition-all"
            >
              Register for Full Access
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-[#528dff]/10 border border-[#528dff]/30 text-[#dee2f2] flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-emerald-400">bolt</span>
              <p className="text-xs">
                <strong className="text-emerald-300 font-semibold">Quick Access Mode:</strong> You can test 1 AI-computed event in preview.
              </p>
            </div>
            <span className="text-[10px] font-mono-tag px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 shrink-0 font-bold">
              1 Event Allowed
            </span>
          </div>
        )
      )}

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-[#171b27] border border-white/10 rounded-2xl">
        <button
          type="button"
          onClick={() => setLogMode('ai_prompt')}
          className={`py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            logMode === 'ai_prompt'
              ? 'bg-[#528dff] text-[#00275f] shadow-lg shadow-[#528dff]/20 font-bold'
              : 'text-[#c2c6d7] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-lg">magic_button</span>
          <span>AI Smart Prompt ✨</span>
        </button>

        <button
          type="button"
          onClick={() => setLogMode('ai_builder')}
          className={`py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            logMode === 'ai_builder'
              ? 'bg-[#528dff] text-[#00275f] shadow-lg shadow-[#528dff]/20 font-bold'
              : 'text-[#c2c6d7] hover:text-white'
          }`}
        >
          <span className="material-symbols-outlined text-lg">calculate</span>
          <span>AI Calculator Matrix</span>
        </button>
      </div>

      {/* AI Smart Prompt Mode */}
      {logMode === 'ai_prompt' && (
        <section className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-[#dee2f2] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#afc6ff]">psychology</span>
              Describe Your Social Activity
            </h2>
            <p className="text-xs text-[#c2c6d7] leading-relaxed">
              Type or speak freely about what you did, who you were with, duration, and how it felt. The AI will compute your exact social battery percentage drain or boost automatically.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <textarea
              rows={4}
              value={nlpPrompt}
              onChange={(e) => setNlpPrompt(e.target.value)}
              placeholder="e.g. Went to a lively rooftop birthday dinner with 8 colleagues for 3 hours, loud music, lots of mingling..."
              className="bg-[#1b1f2b] border border-[#424754]/40 rounded-xl p-4 text-sm md:text-base text-[#dee2f2] focus:outline-none focus:ring-2 focus:ring-[#afc6ff]/50 focus:border-[#afc6ff] transition-all placeholder:text-[#c2c6d7]/40 resize-none"
            />

            {nlpError && (
              <p className="text-xs text-[#ffb4ab] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                {nlpError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                disabled={isComputingNlp || !nlpPrompt.trim()}
                onClick={() => handleProcessNlpPrompt(undefined, true)}
                className="flex-1 bg-gradient-to-r from-[#528dff] to-[#afc6ff] hover:opacity-95 disabled:opacity-50 text-[#00275f] font-bold text-sm md:text-base py-3.5 px-4 rounded-xl shadow-lg shadow-[#528dff]/20 transition-all active:scale-95 flex justify-center items-center gap-2 cursor-pointer"
              >
                {isComputingNlp ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#00275f] border-t-transparent rounded-full animate-spin" />
                    <span>AI Computing &amp; Applying...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">auto_awesome</span>
                    <span>AI Compute &amp; Apply Directly</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isComputingNlp || !nlpPrompt.trim()}
                onClick={() => handleProcessNlpPrompt(undefined, false)}
                className="border border-[#afc6ff]/40 hover:bg-[#afc6ff]/10 disabled:opacity-50 text-[#afc6ff] font-semibold text-sm md:text-base py-3.5 px-4 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">tune</span>
                <span>Review in Matrix</span>
              </button>
            </div>
          </div>

          {/* Quick Examples */}
          <div className="space-y-2.5 pt-2 border-t border-white/5">
            <span className="font-mono-tag text-[11px] uppercase tracking-wider text-[#c2c6d7]">
              Or try a sample scenario:
            </span>
            <div className="flex flex-col gap-2">
              {promptExamples.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNlpPrompt(ex);
                    handleProcessNlpPrompt(ex);
                  }}
                  className="text-left text-xs text-[#c2c6d7] hover:text-[#afc6ff] bg-[#1b1f2b]/60 hover:bg-[#1b1f2b] p-2.5 rounded-xl border border-white/5 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">"{ex}"</span>
                  <span className="material-symbols-outlined text-sm text-[#afc6ff] opacity-0 group-hover:opacity-100 shrink-0">
                    arrow_forward
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* AI Calculator & Customizer Form */}
      {logMode === 'ai_builder' && (
        <section className="glass-panel rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl relative overflow-hidden">
          {/* Top AI Status Banner if AI-computed */}
          {aiAnalysis && (
            <div className="p-4 rounded-2xl bg-[#528dff]/15 border border-[#528dff]/40 text-[#dee2f2] space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#afc6ff] text-xl">psychology_alt</span>
                  <h3 className="font-bold text-sm text-[#afc6ff]">AI Calculated Impact:</h3>
                </div>
                <span
                  className={`font-mono-tag font-bold text-lg px-2.5 py-0.5 rounded-lg ${
                    energyImpact < 0
                      ? 'bg-[#93000a]/40 text-[#ffb4ab] border border-[#ffb4ab]/30'
                      : 'bg-[#29497a]/50 text-[#afc6ff] border border-[#afc6ff]/30'
                  }`}
                >
                  {energyImpact > 0 ? `+${energyImpact}%` : `${energyImpact}%`}
                </span>
              </div>

              <p className="text-xs text-[#c2c6d7] italic leading-relaxed">
                "{aiAnalysis.aiRationale}"
              </p>

              {/* Factor Breakdown Bars */}
              {aiAnalysis.breakdown && aiAnalysis.breakdown.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="font-mono-tag text-[10px] uppercase text-[#afc6ff]/80 tracking-wider">
                    AI Percentage Factor Breakdown:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiAnalysis.breakdown.map((f, i) => (
                      <div key={i} className="bg-[#171b27]/80 p-2 rounded-xl border border-white/5 text-xs flex justify-between items-center">
                        <span className="text-[#dee2f2] font-medium truncate pr-2">{f.factor}</span>
                        <span className={`font-mono-tag font-bold shrink-0 ${f.impact < 0 ? 'text-[#ffb4ab]' : 'text-emerald-300'}`}>
                          {f.impact > 0 ? `+${f.impact}%` : `${f.impact}%`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiAnalysis.rechargeRecommendation && (
                <div className="text-xs bg-[#171b27]/60 p-2.5 rounded-xl border border-[#afc6ff]/20 text-[#afc6ff] flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-400 shrink-0">spa</span>
                  <span><strong>AI Prescription:</strong> {aiAnalysis.rechargeRecommendation}</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5 z-10">
            {/* Activity Name */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="activity_name"
                className="font-mono-tag text-xs uppercase tracking-wider text-[#c2c6d7] font-medium flex justify-between items-center"
              >
                <span>Activity Name</span>
                {isAiGenerated && (
                  <span className="text-[10px] text-emerald-300 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    AI Generated
                  </span>
                )}
              </label>
              <input
                id="activity_name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Dinner with friends"
                className="bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-3 text-base text-[#dee2f2] focus:outline-none focus:ring-2 focus:ring-[#afc6ff]/50 focus:border-[#afc6ff] transition-all placeholder:text-[#c2c6d7]/40"
              />
            </div>

            {/* Type Dropdown */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="activity_type"
                className="font-mono-tag text-xs uppercase tracking-wider text-[#c2c6d7] font-medium"
              >
                Category Type
              </label>
              <div className="relative">
                <select
                  id="activity_type"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as ActivityType)}
                  className="w-full appearance-none bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-3 text-base text-[#dee2f2] focus:outline-none focus:ring-2 focus:ring-[#afc6ff]/50 focus:border-[#afc6ff] transition-all cursor-pointer"
                >
                  <option value="social">Social Gathering</option>
                  <option value="work">Work &amp; Professional</option>
                  <option value="solo">Solo Recharge</option>
                  <option value="rest">Deep Rest &amp; Restoration</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#c2c6d7]">
                  <span className="material-symbols-outlined">expand_more</span>
                </div>
              </div>
            </div>

            {/* Matrix Attributes (Group Size, Noise, Masking, Familiarity) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#171b27] border border-white/5 rounded-2xl">
              {/* Group Size */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tag text-[11px] uppercase tracking-wider text-[#afc6ff]">
                  Crowd / Group Size
                </label>
                <select
                  value={groupSize}
                  onChange={(e) => setGroupSize(e.target.value)}
                  className="bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-3 py-2 text-xs text-[#dee2f2]"
                >
                  <option value="Solo (1 person)">Solo (1 person)</option>
                  <option value="1-on-1 (2 people)">1-on-1 (2 people)</option>
                  <option value="Medium (3-6 people)">Medium (3-6 people)</option>
                  <option value="Large (7+ people)">Large (7+ people)</option>
                  <option value="Crowded Event (20+ people)">Crowded Event (20+ people)</option>
                </select>
              </div>

              {/* Noise Level */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tag text-[11px] uppercase tracking-wider text-[#afc6ff]">
                  Sensory &amp; Noise Level
                </label>
                <select
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(e.target.value)}
                  className="bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-3 py-2 text-xs text-[#dee2f2]"
                >
                  <option value="Quiet / Peaceful">Quiet / Peaceful</option>
                  <option value="Moderate">Moderate Ambient</option>
                  <option value="Loud / Intense">Loud / Overstimulating</option>
                </select>
              </div>

              {/* Masking Demand */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tag text-[11px] uppercase tracking-wider text-[#afc6ff]">
                  Social Masking Demand
                </label>
                <select
                  value={maskingDemand}
                  onChange={(e) => setMaskingDemand(e.target.value)}
                  className="bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-3 py-2 text-xs text-[#dee2f2]"
                >
                  <option value="Zero (100% Unfiltered)">Zero (100% Unfiltered)</option>
                  <option value="Moderate">Moderate (Polite filter)</option>
                  <option value="High (Constantly active)">High (High stakes / Performative)</option>
                </select>
              </div>

              {/* Familiarity */}
              <div className="flex flex-col gap-1.5">
                <label className="font-mono-tag text-[11px] uppercase tracking-wider text-[#afc6ff]">
                  Familiarity with People
                </label>
                <select
                  value={familiarity}
                  onChange={(e) => setFamiliarity(e.target.value)}
                  className="bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-3 py-2 text-xs text-[#dee2f2]"
                >
                  <option value="Close Friends / Family">Close Friends / Safe People</option>
                  <option value="Casual Friends">Casual Friends / Acquaintances</option>
                  <option value="Colleagues / Clients">Colleagues / Clients</option>
                  <option value="Strangers / New People">Strangers / New People</option>
                </select>
              </div>
            </div>

            {/* AI Recompute Button */}
            <button
              type="button"
              disabled={isComputingAI}
              onClick={handleComputeAIPercentage}
              className="py-2.5 px-4 rounded-xl bg-[#528dff]/20 hover:bg-[#528dff]/30 text-[#afc6ff] border border-[#afc6ff]/40 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
            >
              {isComputingAI ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#afc6ff] border-t-transparent rounded-full animate-spin" />
                  <span>Re-computing Percentage...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">refresh</span>
                  <span>Recalculate AI Percentage with Parameters ✨</span>
                </>
              )}
            </button>

            {/* Duration Selector */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="activity_duration"
                className="font-mono-tag text-xs uppercase tracking-wider text-[#c2c6d7] font-medium"
              >
                Duration (Hours)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[0.5, 1, 2, 3].map((hrs) => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setDurationHours(hrs)}
                    className={`py-2 px-3 rounded-xl font-mono-tag text-xs border transition-all cursor-pointer ${
                      durationHours === hrs
                        ? 'bg-[#528dff]/20 border-[#afc6ff] text-[#afc6ff] font-semibold'
                        : 'bg-[#1b1f2b] border-[#424754]/30 text-[#c2c6d7] hover:border-[#424754]'
                    }`}
                  >
                    {hrs} {hrs === 1 ? 'hr' : 'hrs'}
                  </button>
                ))}
              </div>
            </div>

            {/* Estimated Energy Impact Slider */}
            <div className="flex flex-col gap-3 py-2">
              <div className="flex justify-between items-end">
                <label
                  htmlFor="energy_impact"
                  className="font-mono-tag text-xs uppercase tracking-wider text-[#c2c6d7] font-medium"
                >
                  Calculated Percentage Impact
                </label>
                <span
                  className={`font-bold text-2xl ${
                    energyImpact < 0
                      ? 'text-[#ffb4ab]'
                      : energyImpact > 0
                      ? 'text-[#afc6ff]'
                      : 'text-[#dee2f2]'
                  }`}
                >
                  {energyImpact > 0 ? `+${energyImpact}%` : `${energyImpact}%`}
                </span>
              </div>

              <div className="relative w-full py-3">
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-[#ffb4ab]/60 via-[#252a36] to-[#afc6ff]/60 rounded-full pointer-events-none" />
                <input
                  id="energy_impact"
                  type="range"
                  min="-100"
                  max="100"
                  value={energyImpact}
                  onChange={(e) => setEnergyImpact(Number(e.target.value))}
                  className="w-full relative z-10 cursor-pointer"
                />
              </div>

              <div className="flex justify-between font-mono-tag text-[11px] text-[#c2c6d7]/70">
                <span>Drain (-100%)</span>
                <span>Neutral (0%)</span>
                <span>Recharge (+100%)</span>
              </div>
            </div>

            {/* Activity Icon Picker */}
            <div className="flex flex-col gap-2">
              <label className="font-mono-tag text-xs uppercase tracking-wider text-[#c2c6d7] font-medium">
                Choose Activity Icon
              </label>
              <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 bg-[#1b1f2b] p-3 rounded-xl border border-[#424754]/30">
                {availableIcons.map((ic) => (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setSelectedIcon(ic.name)}
                    title={ic.label}
                    className={`p-2.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      selectedIcon === ic.name
                        ? 'bg-[#528dff]/30 border border-[#afc6ff] text-[#afc6ff] scale-105 shadow-md shadow-[#afc6ff]/20'
                        : 'bg-[#252a36] hover:bg-[#2e3444] text-[#c2c6d7] border border-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xl">{ic.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Mood Selection */}
            <div className="flex flex-col gap-2">
              <label className="font-mono-tag text-xs uppercase tracking-wider text-[#c2c6d7] font-medium">
                Mood / Feeling
              </label>
              <div className="flex flex-wrap gap-2">
                {moodOptions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMood(m)}
                    className={`py-1.5 px-3 rounded-xl text-xs transition-all cursor-pointer border ${
                      mood === m
                        ? 'bg-[#afc6ff] text-[#002d6d] border-[#afc6ff] font-semibold'
                        : 'bg-[#1b1f2b] text-[#c2c6d7] border-[#424754]/30 hover:border-[#424754]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes (Optional) */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="notes"
                className="font-mono-tag text-xs uppercase tracking-wider text-[#c2c6d7] font-medium"
              >
                Notes &amp; Reflection
              </label>
              <textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special context or reflections?"
                className="bg-[#1b1f2b] border border-[#424754]/40 rounded-xl px-4 py-3 text-base text-[#dee2f2] focus:outline-none focus:ring-2 focus:ring-[#afc6ff]/50 focus:border-[#afc6ff] transition-all placeholder:text-[#c2c6d7]/40 resize-none"
              />
            </div>

            {/* Action Button */}
            {isLimitReached ? (
              <button
                type="button"
                onClick={onPromptRegister}
                className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-300 hover:opacity-95 text-black font-bold text-base py-3.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex justify-center items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">lock</span>
                <span>Register to Log Additional Events</span>
              </button>
            ) : (
              <button
                type="submit"
                className="mt-4 w-full bg-gradient-to-r from-[#528dff] to-[#afc6ff] hover:opacity-95 text-[#00275f] font-bold text-lg py-3.5 rounded-xl shadow-lg shadow-[#afc6ff]/20 transition-all active:scale-95 flex justify-center items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-2xl">check_circle</span>
                <span>Save AI-Computed Event ({energyImpact > 0 ? `+${energyImpact}%` : `${energyImpact}%`})</span>
              </button>
            )}
          </form>
        </section>
      )}
    </main>
  );
};
