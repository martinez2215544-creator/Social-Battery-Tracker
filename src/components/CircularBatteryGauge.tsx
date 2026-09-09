import React from 'react';

interface CircularBatteryGaugeProps {
  percentage: number;
}

export const CircularBatteryGauge: React.FC<CircularBatteryGaugeProps> = ({ percentage }) => {
  // Clamp percentage between 0 and 100
  const validPercent = Math.min(100, Math.max(0, percentage));
  const circumference = 283;
  const strokeDashoffset = circumference - (circumference * validPercent) / 100;

  // Status message based on energy percentage
  const getStatusMessage = (pct: number) => {
    if (pct >= 80) {
      return 'Your social battery is brimming with energy! Great time for vibrant social plans.';
    } else if (pct >= 50) {
      return 'You have a few hours of social energy left. Plan a recharge soon.';
    } else if (pct >= 25) {
      return 'Social battery running low. Limit high-drain gatherings and consider unplugging.';
    } else {
      return 'Critical battery depletion! Head to The Quiet Room for immediate rest.';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-5">
      <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
        {/* Outer Glow */}
        <div
          className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-700 ${
            validPercent < 30
              ? 'bg-[#ffb4ab]/20 animate-pulse'
              : 'bg-[#528dff]/20 animate-pulse'
          }`}
        />

        {/* Circular SVG Gauge */}
        <svg
          className="w-full h-full -rotate-90 absolute inset-0 drop-shadow-xl"
          viewBox="0 0 100 100"
        >
          {/* Background Track Circle */}
          <circle
            className="text-[#252a36]"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
          />

          {/* Progress Circle */}
          <circle
            className="transition-all duration-1000 ease-out"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="url(#battery-gradient)"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth="6"
          />

          <defs>
            <linearGradient id="battery-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              {validPercent < 30 ? (
                <>
                  <stop offset="0%" stopColor="#93000a" />
                  <stop offset="100%" stopColor="#ffb4ab" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#528dff" />
                  <stop offset="100%" stopColor="#afc6ff" />
                </>
              )}
            </linearGradient>
          </defs>
        </svg>

        {/* Center Percentage Display */}
        <div className="flex flex-col items-center z-10 text-center select-none">
          <div className="flex items-center gap-1 mb-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[10px] font-mono-tag uppercase tracking-widest text-[#afc6ff] font-semibold">
              AI Monitored
            </span>
          </div>
          <span className="font-bold text-5xl md:text-6xl text-gradient tracking-tight">
            {Math.round(validPercent)}%
          </span>
          <span className="font-mono-tag text-xs text-[#c2c6d7] mt-1.5 uppercase tracking-widest font-medium">
            Social Energy
          </span>
        </div>
      </div>

      {/* Dynamic Status Copy */}
      <p className="text-base md:text-lg text-[#dee2f2] text-center max-w-md px-4 leading-relaxed font-normal">
        {getStatusMessage(validPercent)}
      </p>
    </div>
  );
};
