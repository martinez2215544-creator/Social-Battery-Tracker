import React, { useState } from 'react';
import { UserStats } from '../types';

interface AdminInvitationNotificationProps {
  userStats: UserStats;
  currentUserId: string;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
}

export const AdminInvitationNotification: React.FC<AdminInvitationNotificationProps> = ({
  userStats,
  currentUserId,
  onAccept,
  onDecline,
}) => {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const invitation = userStats.adminInvitation;
  const isInvited = userStats.role === 'invited_admin' || invitation?.status === 'pending';

  if (!isInvited || dismissed) {
    return null;
  }

  const handleAcceptClick = async () => {
    setLoading('accept');
    setError(null);
    try {
      await onAccept();
    } catch (err: any) {
      setError(err.message || 'Failed to accept administrator invitation.');
      setLoading(null);
    }
  };

  const handleDeclineClick = async () => {
    setLoading('decline');
    setError(null);
    try {
      await onDecline();
    } catch (err: any) {
      setError(err.message || 'Failed to decline administrator invitation.');
      setLoading(null);
    }
  };

  return (
    <aside aria-label="Administrator Role Promotion" className="relative z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="bg-gradient-to-r from-[#1b1c2e] via-[#1a233a] to-[#201c33] border-2 border-amber-400/60 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-amber-500/10 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0 text-xl shadow-inner">
              👑
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-amber-200 flex items-center gap-1.5">
                  <span>Administrator Role Invitation</span>
                  <span className="text-[10px] font-mono-tag bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold uppercase">
                    Action Required
                  </span>
                </h3>
              </div>
              <p className="text-xs text-[#c2c6d7] leading-relaxed max-w-2xl">
                Super Admin <strong className="text-amber-200">{invitation?.invitedBy || 'Nebo Martinez'}</strong> has invited you to become an <strong className="text-white">Administrator</strong>.
                Upon accepting, you will retain your own name (<strong className="text-[#afc6ff]">{userStats.userName}</strong>) and email (<strong className="text-[#afc6ff]">{userStats.email || 'your registered email'}</strong>) with full admin console privileges.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
            <button
              onClick={handleAcceptClick}
              disabled={loading !== null}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-black font-bold text-xs transition-all shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-1.5"
            >
              {loading === 'accept' ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Accepting...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base font-bold">check</span>
                  <span>Accept Admin Role</span>
                </>
              )}
            </button>

            <button
              onClick={handleDeclineClick}
              disabled={loading !== null}
              className="px-3.5 py-2 rounded-xl bg-[#252a3b] hover:bg-[#32394f] text-[#c2c6d7] hover:text-white border border-white/10 font-semibold text-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95 flex items-center gap-1"
            >
              {loading === 'decline' ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  <span>Declining...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base text-rose-400">close</span>
                  <span>Decline</span>
                </>
              )}
            </button>

            <button
              onClick={() => setDismissed(true)}
              className="p-1 text-[#8c91a4] hover:text-white transition-colors cursor-pointer"
              title="Dismiss notification banner"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-rose-400">error</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </aside>
  );
};
