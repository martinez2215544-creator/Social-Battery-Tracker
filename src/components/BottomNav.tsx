import React from 'react';
import { ActiveTab, UserRole } from '../types';

interface BottomNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onClearSelectedEvent: () => void;
  role?: UserRole;
  isQuickAccess?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onClearSelectedEvent,
  role = 'user',
  isQuickAccess = false,
}) => {
  const handleTabClick = (tab: ActiveTab) => {
    onClearSelectedEvent();
    setActiveTab(tab);
  };

  const isAdmin = role === 'admin';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center px-1 sm:px-4 py-2.5 bg-[#090e19]/90 backdrop-blur-xl border-t border-white/5 shadow-2xl rounded-t-2xl md:hidden">
      {/* Home Tab */}
      <button
        onClick={() => handleTabClick('home')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
          activeTab === 'home'
            ? 'bg-[#528dff] text-[#00275f] font-semibold shadow-md shadow-[#528dff]/20'
            : 'text-[#c2c6d7] hover:bg-[#252a36]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: activeTab === 'home' ? "'FILL' 1" : "'FILL' 0" }}
        >
          home
        </span>
        <span className="font-mono-tag text-[10px] mt-0.5 tracking-wider">Home</span>
      </button>

      {/* Event Logs Tab */}
      <button
        onClick={() => handleTabClick('events')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
          activeTab === 'events' || activeTab === 'log'
            ? 'bg-[#528dff] text-[#00275f] font-semibold shadow-md shadow-[#528dff]/20'
            : 'text-[#c2c6d7] hover:bg-[#252a36]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: activeTab === 'events' || activeTab === 'log' ? "'FILL' 1" : "'FILL' 0" }}
        >
          history
        </span>
        <span className="font-mono-tag text-[10px] mt-0.5 tracking-wider">Event Logs</span>
      </button>

      {/* Recharge Activities Tab */}
      <button
        onClick={() => handleTabClick('recharge')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
          activeTab === 'recharge'
            ? 'bg-emerald-400 text-black font-semibold shadow-md shadow-emerald-400/25'
            : 'text-emerald-300/80 hover:bg-[#252a36]'
        }`}
      >
        <span
          className="material-symbols-outlined text-xl"
          style={{ fontVariationSettings: activeTab === 'recharge' ? "'FILL' 1" : "'FILL' 0" }}
        >
          bolt
        </span>
        <span className="font-mono-tag text-[10px] mt-0.5 tracking-wider">Recharge</span>
      </button>

      {/* Burnout Tab */}
      <button
        onClick={() => handleTabClick('burnout')}
        className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer relative ${
          activeTab === 'burnout'
            ? isQuickAccess
              ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
              : 'bg-[#528dff] text-[#00275f] font-semibold shadow-md shadow-[#528dff]/20'
            : isQuickAccess
              ? 'text-amber-300/70 hover:bg-[#252a36]'
              : 'text-[#c2c6d7] hover:bg-[#252a36]'
        }`}
      >
        <div className="relative">
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: activeTab === 'burnout' ? "'FILL' 1" : "'FILL' 0" }}
          >
            {isQuickAccess ? 'lock' : 'query_stats'}
          </span>
        </div>
        <span className="font-mono-tag text-[10px] mt-0.5 tracking-wider">
          {isQuickAccess ? 'Burnout 🔒' : 'Burnout'}
        </span>
      </button>

      {/* Admin Tab (If Admin) */}
      {isAdmin && (
        <button
          onClick={() => handleTabClick('admin')}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 active:scale-90 cursor-pointer ${
            activeTab === 'admin'
              ? 'bg-amber-500 text-black font-semibold shadow-md shadow-amber-500/20'
              : 'text-amber-300/80 hover:bg-[#252a36]'
          }`}
        >
          <span
            className="material-symbols-outlined text-xl"
            style={{ fontVariationSettings: activeTab === 'admin' ? "'FILL' 1" : "'FILL' 0" }}
          >
            admin_panel_settings
          </span>
          <span className="font-mono-tag text-[10px] mt-0.5 tracking-wider">Admin</span>
        </button>
      )}
    </nav>
  );
};
