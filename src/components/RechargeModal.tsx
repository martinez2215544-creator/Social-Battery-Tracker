import React, { useState, useEffect, useRef } from 'react';

interface RechargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleteRecharge: (rechargeAmount: number) => void;
  isQuickAccess?: boolean;
  onPromptRegister?: () => void;
}

export const RechargeModal: React.FC<RechargeModalProps> = ({
  isOpen,
  onClose,
  onCompleteRecharge,
  isQuickAccess = false,
  onPromptRegister,
}) => {
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [secondsLeft, setSecondsLeft] = useState(60); // 1 minute default recharge session
  const [isActive, setIsActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioNode | null>(null);

  // Breathing loop cycle (Inhale 4s, Hold 4s, Exhale 4s)
  useEffect(() => {
    if (!isOpen || !isActive) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isActive]);

  useEffect(() => {
    if (!isOpen || !isActive) return;

    const cycleTime = (60 - secondsLeft) % 12;
    if (cycleTime < 4) {
      setBreathPhase('Inhale');
    } else if (cycleTime < 8) {
      setBreathPhase('Hold');
    } else {
      setBreathPhase('Exhale');
    }
  }, [secondsLeft, isActive, isOpen]);

  // Ambient White Noise Synth generator using Web Audio API
  const toggleSound = () => {
    if (soundEnabled) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setSoundEnabled(false);
    } else {
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioCtxRef.current = ctx;

        // Create brown/pink noise buffer for soothing ocean/rain ambient sound
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let lastOut = 0.0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02; // Brown noise filter
          lastOut = output[i];
          output[i] *= 0.15; // Soft volume
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);

        whiteNoise.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();

        noiseNodeRef.current = whiteNoise;
        setSoundEnabled(true);
      } catch {
        console.warn('AudioContext not supported');
      }
    }
  };

  const handleFinish = () => {
    if (soundEnabled && audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
      setSoundEnabled(false);
    }
    onCompleteRecharge(20); // Add +20% energy
    onClose();
  };

  if (!isOpen) return null;

  // Locked Quiet Room View for Quick Access Mode
  if (isQuickAccess) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
        <div className="glass-panel bg-[#0e131e]/95 border border-amber-500/40 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl flex flex-col items-center text-center space-y-5 relative overflow-hidden animate-in zoom-in-95 duration-150">
          {/* Glowing background halo */}
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 via-transparent to-[#528dff]/10 pointer-events-none" />

          {/* Top close */}
          <div className="w-full flex justify-between items-center z-10">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono-tag text-[10px] uppercase font-semibold">
              <span className="material-symbols-outlined text-xs">lock</span>
              <span>Quick Access Mode</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-[#c2c6d7] hover:text-[#dee2f2] p-1 rounded-full cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>

          {/* Locked Badge & Icon */}
          <div className="relative my-2">
            <div className="w-24 h-24 rounded-3xl bg-[#171b27] border-2 border-amber-500/40 flex items-center justify-center shadow-xl shadow-amber-500/10 relative">
              <span className="material-symbols-outlined text-amber-400 text-5xl animate-pulse">
                lock
              </span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[#528dff] flex items-center justify-center text-[#00275f] shadow-md">
              <span className="material-symbols-outlined text-base">battery_charging_full</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-2 z-10">
            <h2 className="text-xl font-bold text-[#dee2f2]">Recharge is Locked</h2>
            <p className="text-xs sm:text-sm text-[#c2c6d7] leading-relaxed">
              The Recharge feature and Quiet Room sanctuary are exclusive to registered members. You must register for an account to use the recharge feature and restore +20% social battery.
            </p>
          </div>

          {/* Feature Highlights */}
          <div className="w-full bg-[#171b27] border border-white/5 rounded-2xl p-3.5 text-left text-xs space-y-2 z-10">
            <div className="flex items-center gap-2 text-[#afc6ff] font-medium">
              <span className="material-symbols-outlined text-sm text-emerald-400">battery_charging_full</span>
              <span>Instant +20% Social Battery recharge recovery</span>
            </div>
            <div className="flex items-center gap-2 text-[#afc6ff] font-medium">
              <span className="material-symbols-outlined text-sm text-emerald-400">self_improvement</span>
              <span>Guided rhythmic breathing loop (4-4-4 cycle)</span>
            </div>
            <div className="flex items-center gap-2 text-[#afc6ff] font-medium">
              <span className="material-symbols-outlined text-sm text-emerald-400">volume_up</span>
              <span>Synthesized ambient white noise &amp; ocean audio</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5 z-10 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onPromptRegister) onPromptRegister();
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-300 hover:opacity-95 text-black font-bold py-3.5 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-base">how_to_reg</span>
              <span>Register to Unlock Recharge</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-[#1b1f2b] hover:bg-[#252a36] text-[#c2c6d7] font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="glass-panel bg-[#0e131e]/90 border border-[#424754]/50 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl flex flex-col items-center text-center space-y-6 relative overflow-hidden">
        {/* Glowing background halo */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#528dff]/10 via-transparent to-[#afc6ff]/10 pointer-events-none" />

        {/* Top bar */}
        <div className="w-full flex justify-between items-center z-10">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#afc6ff]">
              battery_charging_full
            </span>
            <span className="font-mono-tag text-xs uppercase text-[#afc6ff] font-semibold">
              Recharge Session
            </span>
          </div>

          <button
            onClick={() => {
              if (soundEnabled && audioCtxRef.current) audioCtxRef.current.close();
              onClose();
            }}
            className="text-[#c2c6d7] hover:text-[#dee2f2] p-1 rounded-full"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Breathing Sphere Animation */}
        <div className="relative w-48 h-48 my-2 flex items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-tr from-[#528dff] to-[#afc6ff] opacity-20 blur-xl transition-all duration-1000 ${
              breathPhase === 'Inhale'
                ? 'scale-125 opacity-40'
                : breathPhase === 'Hold'
                ? 'scale-110 opacity-30'
                : 'scale-90 opacity-15'
            }`}
          />

          <div
            className={`w-36 h-36 rounded-full border-2 border-[#afc6ff]/40 bg-[#171b27]/80 backdrop-blur-md flex flex-col items-center justify-center transition-transform duration-1000 shadow-2xl ${
              breathPhase === 'Inhale'
                ? 'scale-110 border-[#afc6ff]'
                : breathPhase === 'Hold'
                ? 'scale-105 border-[#528dff]'
                : 'scale-95 border-[#424754]'
            }`}
          >
            <span className="text-xl font-bold text-[#dee2f2]">
              {isActive ? breathPhase : 'Ready'}
            </span>
            <span className="font-mono-tag text-xs text-[#afc6ff] mt-1">
              {secondsLeft}s
            </span>
          </div>
        </div>

        {/* Instructions */}
        <p className="text-sm text-[#c2c6d7] max-w-xs leading-relaxed z-10">
          {isActive
            ? 'Inhale deeply as the circle expands, hold gently, and exhale all tension.'
            : 'Take a minute of quiet space to disconnect, breathe, and restore +20% social battery.'}
        </p>

        {/* Ambient Audio Switch */}
        <button
          onClick={toggleSound}
          className={`px-4 py-2 rounded-xl text-xs font-mono-tag flex items-center gap-2 border transition-all z-10 ${
            soundEnabled
              ? 'bg-[#528dff]/20 border-[#afc6ff] text-[#afc6ff]'
              : 'bg-[#1b1f2b] border-[#424754]/40 text-[#c2c6d7] hover:border-[#424754]'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {soundEnabled ? 'volume_up' : 'volume_off'}
          </span>
          <span>{soundEnabled ? 'Ambient White Noise (ON)' : 'Enable Ambient Sound'}</span>
        </button>

        {/* Action Controls */}
        <div className="w-full flex gap-3 z-10 pt-2">
          {!isActive && secondsLeft > 0 ? (
            <button
              onClick={() => setIsActive(true)}
              className="flex-1 bg-[#afc6ff] hover:bg-[#d9e2ff] text-[#002d6d] font-semibold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Start Breathing Loop
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex-1 bg-[#528dff] hover:bg-[#afc6ff] text-[#00275f] font-semibold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              Complete &amp; Restore +20%
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
