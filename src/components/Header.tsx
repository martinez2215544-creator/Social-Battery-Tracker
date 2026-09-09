import React, { useState, useRef, useEffect } from 'react';
import { ActiveTab, UserPresence, UserRole } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  selectedEventId: string | null;
  setSelectedEventId: (id: string | null) => void;
  onOpenProfile: () => void;
  onOpenRecharge: () => void;
  avatarUrl: string;
  presence?: UserPresence;
  role?: UserRole;
  onUpdatePresence?: (presence: UserPresence) => void;
  isQuickAccess?: boolean;
  onPromptRegister?: () => void;
  hasAdminInvite?: boolean;
  onOpenAdminInvite?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedEventId,
  setSelectedEventId,
  onOpenProfile,
  avatarUrl,
  presence = 'active',
  role = 'user',
  onUpdatePresence,
  isQuickAccess = false,
  onPromptRegister,
  hasAdminInvite = false,
  onOpenAdminInvite,
}) => {
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const logoUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGYxFW9lopaQeb_W9t_VKNf5BKzl5Rjire3Z83YQFACQEUGw_TRqNmG8Whb1nLvy9B-BOBqIRwu5cGl8GbH_jhDqi4bBYxu_C1x2GcwkpoW226xxTx8tvVYacs4xbUiXMuqS7EGIweLTBNBNpbzNDIRNEkcAtMJour2N4x7KDo89sn3xqT0ikRH8UZ8KuqDT_R17zufXTKPqQZKv3tJpK-4wBXQ4hqhnX3CX9irQu2sPFIYn6eWeovKc-YptG5uMxlWA';

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowPresenceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBack = () => {
    if (selectedEventId) {
      setSelectedEventId(null);
      setActiveTab('home');
    } else {
      setActiveTab('home');
    }
  };

  const presenceConfig: Record<
    UserPresence,
    { label: string; dotClass: string; bgClass: string; textClass: string; icon: string; desc: string }
  > = {
    active: {
      label: 'Active',
      dotClass: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
      textClass: 'text-emerald-300',
      icon: 'bolt',
      desc: 'Ready to socialize & connect',
    },
    away: {
      label: 'Away',
      dotClass: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
      bgClass: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
      textClass: 'text-amber-300',
      icon: 'schedule',
      desc: 'Taking a short break / Low battery',
    },
    dnd: {
      label: 'Do Not Disturb',
      dotClass: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
      bgClass: 'bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',
      textClass: 'text-rose-300',
      icon: 'do_not_disturb_on',
      desc: 'Quiet room mode / Do not disturb',
    },
  };

  const currentPresence = presenceConfig[presence] || presenceConfig.active;
  const isAdmin = role === 'admin';

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 bg-[#0e131e]/80 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-[#528dff]/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-full flex justify-between items-center">
        
        {/* Left: Brand or Back Button */}
        <div className="flex items-center gap-3">
          {activeTab === 'event-detail' || selectedEventId ? (
            <button
              onClick={handleBack}
              aria-label="Back to home"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#c2c6d7] hover:text-[#dee2f2] hover:bg-[#1b1f2b] active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">arrow_back</span>
            </button>
          ) : null}

          <div
            onClick={() => {
              setSelectedEventId(null);
              setActiveTab('home');
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all"
          >
            <img
              src={logoUrl}
              alt="Social Battery Tracker Logo"
              className="h-10 w-auto object-contain rounded-full shadow-sm"
            />
            <span className="font-bold text-base md:text-xl text-[#afc6ff] tracking-tight">
              Social Battery Tracker
            </span>
          </div>
        </div>

        {/* Center Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            onClick={() => {
              setSelectedEventId(null);
              setActiveTab('home');
            }}
            className={`font-mono-tag text-xs tracking-wider transition-colors cursor-pointer ${
              activeTab === 'home' && !selectedEventId
                ? 'text-[#afc6ff] font-semibold border-b-2 border-[#afc6ff] pb-1'
                : 'text-[#c2c6d7] hover:text-[#dee2f2]'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => {
              setSelectedEventId(null);
              setActiveTab('events');
            }}
            className={`font-mono-tag text-xs tracking-wider transition-colors cursor-pointer ${
              (activeTab === 'events' || activeTab === 'log') && !selectedEventId
                ? 'text-[#afc6ff] font-semibold border-b-2 border-[#afc6ff] pb-1'
                : 'text-[#c2c6d7] hover:text-[#dee2f2]'
            }`}
          >
            Event Logs
          </button>
          <button
            onClick={() => {
              setSelectedEventId(null);
              setActiveTab('recharge');
            }}
            className={`font-mono-tag text-xs tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'recharge'
                ? 'text-emerald-300 font-semibold border-b-2 border-emerald-300 pb-1'
                : 'text-[#c2c6d7] hover:text-emerald-300'
            }`}
          >
            <span className="material-symbols-outlined text-xs text-emerald-400">bolt</span>
            <span>Recharge Hub</span>
          </button>
          <button
            onClick={() => {
              setSelectedEventId(null);
              setActiveTab('burnout');
            }}
            className={`font-mono-tag text-xs tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'burnout'
                ? isQuickAccess
                  ? 'text-amber-300 font-bold border-b-2 border-amber-300 pb-1'
                  : 'text-[#afc6ff] font-semibold border-b-2 border-[#afc6ff] pb-1'
                : isQuickAccess
                  ? 'text-amber-300/70 hover:text-amber-300'
                  : 'text-[#c2c6d7] hover:text-[#dee2f2]'
            }`}
          >
            {isQuickAccess && <span className="material-symbols-outlined text-xs text-amber-400">lock</span>}
            <span>Burnout</span>
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedEventId(null);
                setActiveTab('admin');
              }}
              className={`font-mono-tag text-xs tracking-wider transition-colors flex items-center gap-1 cursor-pointer ${
                activeTab === 'admin'
                  ? 'text-amber-300 font-bold border-b-2 border-amber-300 pb-1'
                  : 'text-amber-300/80 hover:text-amber-300'
              }`}
            >
              <span>👑</span>
              <span>Admin Console</span>
            </button>
          )}
        </nav>

        {/* Right: Presence Status Toggle, Admin shortcut, & Avatar */}
        <div className="flex items-center gap-2.5 relative" ref={menuRef}>
          {/* Quick Access Mode Register Trigger */}
          {isQuickAccess && onPromptRegister && (
            <button
              onClick={onPromptRegister}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm shadow-amber-500/10"
              title="Quick Access Mode (1 event limit) - Click to Register"
            >
              <span className="material-symbols-outlined text-sm text-amber-400">bolt</span>
              <span className="hidden sm:inline font-mono-tag uppercase text-[10px]">Quick Access</span>
              <span className="text-[10px] font-bold text-amber-200 underline sm:no-underline">Register</span>
            </button>
          )}

          {/* Admin Role Invitation Pending Badge */}
          {hasAdminInvite && (
            <button
              onClick={onOpenAdminInvite || onOpenProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 to-purple-500/25 border-2 border-amber-400 text-amber-300 hover:text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-amber-500/20 animate-pulse active:scale-95"
              title="You have a pending Administrator invitation! Click to review and accept."
            >
              <span>👑</span>
              <span className="font-mono-tag text-[11px] uppercase">Admin Invite (1)</span>
            </button>
          )}

          {/* Admin shortcut button for mobile / tablet */}
          {isAdmin && (
            <button
              onClick={() => {
                setSelectedEventId(null);
                setActiveTab('admin');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
              }`}
              title="Admin Dashboard"
            >
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              <span className="hidden sm:inline font-mono-tag uppercase text-[10px]">Admin</span>
            </button>
          )}

          {/* Presence Quick Toggle Pill */}
          <button
            type="button"
            onClick={() => setShowPresenceMenu(!showPresenceMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${currentPresence.bgClass} ${currentPresence.textClass}`}
            title="Click to change status (Active, Away, Do Not Disturb)"
          >
            <span className={`w-2 h-2 rounded-full ${currentPresence.dotClass}`} />
            <span className="hidden sm:inline font-semibold">{currentPresence.label}</span>
            <span className="material-symbols-outlined text-sm opacity-80">arrow_drop_down</span>
          </button>

          {/* Presence Dropdown Menu */}
          {showPresenceMenu && (
            <div className="absolute right-12 top-12 w-64 bg-[#171b27] border border-[#afc6ff]/30 rounded-2xl p-2 shadow-2xl shadow-black/80 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-3 py-2 border-b border-white/5 mb-1">
                <p className="text-[11px] font-mono-tag uppercase tracking-wider text-[#afc6ff]">
                  Set Status
                </p>
              </div>
              <div className="space-y-1">
                {(['active', 'away', 'dnd'] as UserPresence[]).map((pKey) => {
                  const cfg = presenceConfig[pKey];
                  const isSelected = presence === pKey;
                  return (
                    <button
                      key={pKey}
                      onClick={() => {
                        if (onUpdatePresence) onUpdatePresence(pKey);
                        setShowPresenceMenu(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#252a36] border border-[#afc6ff]/40'
                          : 'hover:bg-[#1f2433] border border-transparent'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${cfg.dotClass}`} />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${cfg.textClass}`}>{cfg.label}</span>
                          {isSelected && (
                            <span className="material-symbols-outlined text-xs text-[#afc6ff]">
                              check
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#c2c6d7] leading-snug">{cfg.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 mt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setShowPresenceMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full text-left p-2 rounded-xl flex items-center gap-2.5 text-xs text-[#afc6ff] hover:bg-[#1f2433] transition-all cursor-pointer font-medium"
                >
                  <span className="material-symbols-outlined text-sm">manage_accounts</span>
                  <span>Account & Security Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* User Profile Avatar with Presence Indicator Dot */}
          <div className="relative">
            <button
              onClick={onOpenProfile}
              aria-label="User Profile"
              className="w-10 h-10 rounded-full overflow-hidden border border-[#424754]/40 hover:border-[#afc6ff]/60 active:scale-95 transition-all flex items-center justify-center bg-[#171b27] shrink-0 cursor-pointer"
            >
              {avatarUrl.startsWith('http') || avatarUrl.startsWith('data:') ? (
                <img
                  src={avatarUrl}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="material-symbols-outlined text-[#afc6ff] text-xl">
                  {avatarUrl || 'person'}
                </span>
              )}
            </button>
            {/* Status Dot on Avatar */}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0e131e] ${currentPresence.dotClass}`}
            />
          </div>
        </div>

      </div>
    </header>
  );
};
