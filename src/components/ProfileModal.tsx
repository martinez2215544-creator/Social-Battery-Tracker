import React, { useState } from 'react';
import { SocialEvent, UserStats, UserPresence } from '../types';
import { resetUserPassword, resetUserEmail, sendResetEmailLink } from '../lib/firebase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: UserStats;
  events: SocialEvent[];
  userEmail?: string | null;
  isAnonymous?: boolean;
  isQuickAccess?: boolean;
  onSignOut?: () => void;
  onResetData: () => void;
  onUpdateUserName?: (newName: string) => void;
  onUpdateAvatar?: (newAvatar: string) => void;
  onUpdatePresence?: (presence: UserPresence) => void;
  onUpdateBaseCapacity?: (capacity: number) => void;
  onOpenAdmin?: () => void;
  onPromptRegister?: () => void;
  onAcceptAdminInvite?: () => Promise<void>;
  onDeclineAdminInvite?: () => Promise<void>;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  stats,
  events,
  userEmail,
  isAnonymous,
  isQuickAccess,
  onSignOut,
  onResetData,
  onUpdateUserName,
  onUpdateAvatar,
  onUpdatePresence,
  onUpdateBaseCapacity,
  onOpenAdmin,
  onPromptRegister,
  onAcceptAdminInvite,
  onDeclineAdminInvite,
}) => {
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(stats.userName);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [customCapacity, setCustomCapacity] = useState<number>(stats.baseCapacity || 100);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const triggerSaveFeedback = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => {
      setSaveFeedback(null);
    }, 2500);
  };

  // Security, Email & Password reset state
  const [showSecuritySection, setShowSecuritySection] = useState(false);
  const [securityTab, setSecurityTab] = useState<'email' | 'password'>('email');
  
  // Email reset state
  const [currentEmailInput, setCurrentEmailInput] = useState('');
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Password reset state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentPresence = stats.presence || 'active';
  const isAdmin = stats.role === 'admin';

  const presenceOptions: { key: UserPresence; label: string; desc: string; color: string; dot: string; icon: string }[] = [
    {
      key: 'active',
      label: 'Active',
      desc: 'Ready to socialize',
      color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
      dot: 'bg-emerald-400',
      icon: 'bolt',
    },
    {
      key: 'away',
      label: 'Away',
      desc: 'Taking a short break',
      color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
      dot: 'bg-amber-400',
      icon: 'schedule',
    },
    {
      key: 'dnd',
      label: 'Do Not Disturb',
      desc: 'Quiet room / Resting',
      color: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
      dot: 'bg-rose-500',
      icon: 'do_not_disturb_on',
    },
  ];

  const handleSaveName = () => {
    if (editedName.trim() && onUpdateUserName) {
      onUpdateUserName(editedName.trim());
      triggerSaveFeedback('Display name updated and saved!');
    }
    setIsEditingName(false);
  };

  const handleSelectAvatar = (avatar: string) => {
    if (onUpdateAvatar) {
      onUpdateAvatar(avatar);
      triggerSaveFeedback('Profile avatar updated and saved!');
    }
    setIsEditingAvatar(false);
  };

  const handleSaveCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (customUrl.trim() && onUpdateAvatar) {
      onUpdateAvatar(customUrl.trim());
      setCustomUrl('');
      triggerSaveFeedback('Custom profile picture saved!');
    }
    setIsEditingAvatar(false);
  };

  const handleSaveCapacity = (val: number) => {
    const clamped = Math.max(50, Math.min(200, val));
    setCustomCapacity(clamped);
    if (onUpdateBaseCapacity) {
      onUpdateBaseCapacity(clamped);
      triggerSaveFeedback(`Battery capacity set to ${clamped}% and saved!`);
    }
    setIsEditingCapacity(false);
  };

  const avatarPresets = [
    { label: 'Default Photo', value: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5vQ8TTJrlgfnNnfct59vCYB9zX8AKGidN7rIsfII9QYo9WEoDC3fhiwmoA_UxOnmTyQheHI7CYqF9lD7RgfteqQE-kBT7aoU1qK_sKsawj_sEm_x0BfDUz55pSIXHxQ_rX1TeClkNqPGZKHkKUobnABO8Ar3_9NQVFBEIAZjFXxovPXG7abY2r0WZskx9VODHwLwT_ViUYEMH_xXcvWfGH7gVpEgLk6Ch5KN3DR_j4ELf986KmTBH' },
    { label: 'User', value: 'person' },
    { label: 'Face', value: 'face' },
    { label: 'Zen', value: 'self_improvement' },
    { label: 'Battery', value: 'battery_charging_full' },
    { label: 'Bolt', value: 'bolt' },
    { label: 'Moon', value: 'mode_night' },
    { label: 'Sparkles', value: 'auto_awesome' },
    { label: 'Robot', value: 'smart_toy' },
  ];

  // Calculate statistics
  const totalEvents = events.length;
  const drainEvents = events.filter((e) => e.energyImpact < 0);
  const totalDrains = drainEvents.length;
  const totalRecharges = events.filter((e) => e.energyImpact > 0).length;
  const avgDrain =
    totalDrains > 0
      ? Math.round(
          Math.abs(drainEvents.reduce((acc, curr) => acc + curr.energyImpact, 0)) /
            totalDrains
        )
      : 0;

  const effectiveEmail = userEmail || stats.email || '';

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const emailToUse = effectiveEmail || currentEmailInput.trim();
    if (!emailToUse) {
      setEmailError('Please enter your current account email.');
      return;
    }
    if (!newEmailInput.trim()) {
      setEmailError('Please enter a new email address.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await resetUserEmail(emailToUse, newEmailInput.trim());
      setEmailSuccess(res.message);
      setNewEmailInput('');
      setCurrentEmailInput('');
    } catch (err: any) {
      setEmailError(err.message || 'Failed to update email address.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleSendResetEmailOnly = async () => {
    setEmailError(null);
    setEmailSuccess(null);

    const targetEmail = (newEmailInput.trim() || effectiveEmail || currentEmailInput.trim());
    if (!targetEmail) {
      setEmailError('Please specify an email address to send the reset link.');
      return;
    }

    setEmailLoading(true);
    try {
      const res = await sendResetEmailLink(targetEmail);
      setEmailSuccess(res.message);
    } catch (err: any) {
      setEmailError(err.message || 'Failed to dispatch reset email.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!effectiveEmail) {
      setPasswordError('No registered email found for this profile. Please register or sign in first.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify and try again.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await resetUserPassword(effectiveEmail, newPassword);
      setPasswordSuccess(res.message);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!effectiveEmail) {
      setPasswordError('No registered email found for this profile.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await resetUserPassword(effectiveEmail);
      setPasswordSuccess(res.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to send reset email.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="bg-[#171b27] border border-[#afc6ff]/30 w-full max-w-lg rounded-3xl p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#afc6ff] text-xl">account_circle</span>
            <h2 className="text-lg font-bold text-[#dee2f2]">Social Energy Profile</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[#252a36] text-[#c2c6d7] hover:text-[#dee2f2] hover:bg-[#32394a] flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Save Confirmation Notification Banner */}
        {saveFeedback && (
          <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-200">
            <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
            <span className="font-medium">{saveFeedback}</span>
          </div>
        )}

        {/* User Identity & Avatar Selector */}
        <div className="bg-[#0e131e] p-4 rounded-2xl border border-white/5 space-y-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#528dff]/40 bg-[#1b1f2b] flex items-center justify-center shadow-lg">
                {stats.avatarUrl?.startsWith('http') || stats.avatarUrl?.startsWith('data:') ? (
                  <img
                    src={stats.avatarUrl}
                    alt={stats.userName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="material-symbols-outlined text-[#afc6ff] text-3xl">
                    {stats.avatarUrl || 'person'}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsEditingAvatar(!isEditingAvatar)}
                className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
                title="Change Avatar"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>

            {/* Name & Status */}
            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="bg-[#1b1f2b] border border-[#afc6ff]/40 rounded-lg px-2.5 py-1 text-sm text-[#dee2f2] focus:outline-none w-full"
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-2.5 py-1 rounded-lg bg-[#528dff] text-[#00275f] text-xs font-bold hover:bg-[#a9c7ff] cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-[#dee2f2]">{stats.userName}</h3>
                  <button
                    onClick={() => {
                      setEditedName(stats.userName);
                      setIsEditingName(true);
                    }}
                    className="text-[#c2c6d7] hover:text-[#afc6ff] transition-colors cursor-pointer"
                    title="Edit Name"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {isEditingCapacity ? (
                  <div className="flex items-center gap-1.5 bg-[#1b1f2b] px-2 py-0.5 rounded-lg border border-[#afc6ff]/40">
                    <span className="text-[10px] text-[#c2c6d7] font-mono-tag">Cap:</span>
                    <input
                      type="number"
                      min={50}
                      max={200}
                      value={customCapacity}
                      onChange={(e) => setCustomCapacity(parseInt(e.target.value, 10) || 100)}
                      className="w-12 bg-transparent text-xs text-[#dee2f2] font-mono-tag focus:outline-none"
                    />
                    <span className="text-[10px] text-[#c2c6d7] font-mono-tag">%</span>
                    <button
                      onClick={() => handleSaveCapacity(customCapacity)}
                      className="text-[10px] text-[#528dff] font-bold hover:underline cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setCustomCapacity(stats.baseCapacity || 100);
                      setIsEditingCapacity(true);
                    }}
                    className="font-mono-tag text-xs text-[#afc6ff] bg-[#528dff]/10 hover:bg-[#528dff]/20 px-2 py-0.5 rounded border border-[#afc6ff]/20 flex items-center gap-1 transition-all cursor-pointer"
                    title="Customize base battery capacity"
                  >
                    <span>Capacity: {stats.baseCapacity}%</span>
                    <span className="material-symbols-outlined text-[11px] opacity-70">tune</span>
                  </button>
                )}
                {isAdmin ? (
                  <span className="font-mono-tag text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1">
                    👑 Administrator
                  </span>
                ) : stats.role === 'invited_admin' || stats.adminInvitation?.status === 'pending' ? (
                  <span className="font-mono-tag text-[10px] uppercase font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40 flex items-center gap-1 animate-pulse">
                    👑 Admin Invited
                  </span>
                ) : (
                  <span className="font-mono-tag text-[10px] uppercase text-[#c2c6d7] bg-white/5 px-2 py-0.5 rounded">
                    Member
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Avatar Chooser dropdown */}
          {isEditingAvatar && (
            <div className="pt-3 border-t border-white/5 space-y-3">
              <p className="text-xs font-mono-tag uppercase text-[#c2c6d7]">Choose Avatar Icon or Preset</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {avatarPresets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleSelectAvatar(preset.value)}
                    className="p-2 rounded-xl bg-[#1b1f2b] hover:bg-[#252a36] border border-white/5 hover:border-[#afc6ff]/40 flex flex-col items-center gap-1 transition-all cursor-pointer"
                  >
                    {preset.value.startsWith('http') ? (
                      <img src={preset.value} alt="" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-lg text-[#afc6ff]">
                        {preset.value}
                      </span>
                    )}
                    <span className="text-[9px] font-mono-tag text-[#c2c6d7] truncate w-full text-center">
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Custom Image URL */}
              <form onSubmit={handleSaveCustomUrl} className="flex gap-2 pt-1">
                <input
                  type="url"
                  placeholder="Or paste custom image URL..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="flex-1 bg-[#1b1f2b] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[#252a36] hover:bg-[#32394a] text-xs font-bold text-[#afc6ff] cursor-pointer"
                >
                  Apply
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Live Presence Status Selector */}
        <div className="space-y-2">
          <label className="font-mono-tag text-xs text-[#afc6ff] uppercase tracking-wider block">
            Availability Status (Presence)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {presenceOptions.map((opt) => {
              const isSelected = currentPresence === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onUpdatePresence && onUpdatePresence(opt.key)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? `${opt.color} shadow-md scale-[1.02]`
                      : 'bg-[#1b1f2b] border-white/5 text-[#c2c6d7] hover:bg-[#252a36]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                    <span className="material-symbols-outlined text-sm opacity-80">{opt.icon}</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{opt.label}</span>
                    <span className="text-[10px] opacity-70 leading-tight block">{opt.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pending Administrator Promotion Review Card */}
        {(stats.role === 'invited_admin' || stats.adminInvitation?.status === 'pending') && (
          <div className="bg-gradient-to-r from-[#1b1c2e] via-[#1a233a] to-[#201c33] border-2 border-amber-400/60 rounded-2xl p-4 space-y-3 shadow-lg shadow-amber-500/10">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-xl shrink-0 text-amber-300">
                👑
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-amber-200">
                    Administrator Invitation Pending
                  </h4>
                  <span className="text-[10px] font-mono-tag bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold uppercase">
                    Action Required
                  </span>
                </div>
                <p className="text-[11px] text-[#c2c6d7] leading-relaxed">
                  Super Admin <strong className="text-amber-200">{stats.adminInvitation?.invitedBy || 'Nebo Martinez'}</strong> invited you to become an Administrator. Upon accepting, you will retain your own name (<strong className="text-[#afc6ff]">{stats.userName}</strong>) and email (<strong className="text-[#afc6ff]">{effectiveEmail || stats.email || 'your registered email'}</strong>).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (onAcceptAdminInvite) {
                    await onAcceptAdminInvite();
                  }
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-black font-bold text-xs transition-all shadow-md shadow-amber-400/20 cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm font-bold">check</span>
                <span>Accept Admin Role</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeclineAdminInvite) {
                    await onDeclineAdminInvite();
                  }
                }}
                className="py-2 px-3 rounded-xl bg-[#1e2333] hover:bg-[#282f45] text-[#c2c6d7] hover:text-white border border-white/10 text-xs font-semibold transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm text-rose-400">close</span>
                <span>Decline</span>
              </button>
            </div>
          </div>
        )}

        {/* Lifetime Telemetry Stats */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-[#1b1f2b] p-3.5 rounded-xl border border-white/5">
            <span className="font-mono-tag text-[10px] text-[#c2c6d7] uppercase block mb-1">
              Logged Interactions
            </span>
            <span className="text-xl font-bold text-[#dee2f2]">{totalEvents} events</span>
          </div>

          <div className="bg-[#1b1f2b] p-3.5 rounded-xl border border-white/5">
            <span className="font-mono-tag text-[10px] text-[#c2c6d7] uppercase block mb-1">
              Avg. Drain per Social
            </span>
            <span className="text-xl font-bold text-[#ffb4ab]">{avgDrain}%</span>
          </div>

          <div className="bg-[#1b1f2b] p-3.5 rounded-xl border border-white/5">
            <span className="font-mono-tag text-[10px] text-[#c2c6d7] uppercase block mb-1">
              Drain Events
            </span>
            <span className="text-xl font-bold text-[#ffb4ab]">{totalDrains}</span>
          </div>

          <div className="bg-[#1b1f2b] p-3.5 rounded-xl border border-white/5">
            <span className="font-mono-tag text-[10px] text-[#c2c6d7] uppercase block mb-1">
              Recharge Sessions
            </span>
            <span className="text-xl font-bold text-[#a9c7ff]">{totalRecharges}</span>
          </div>
        </div>

        {/* Cloud Sync & Account Details */}
        <div className="bg-[#1b1f2b] p-3.5 rounded-xl border border-white/5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[#dee2f2] font-medium truncate max-w-[200px]">
              {userEmail ? userEmail : isAnonymous || isQuickAccess ? 'Quick Access / Preview Account' : 'Cloud Sync Active'}
            </span>
          </div>
          <span className="font-mono-tag text-[10px] text-[#afc6ff] uppercase tracking-wider bg-[#528dff]/10 px-2 py-0.5 rounded border border-[#afc6ff]/20">
            {isAnonymous || isQuickAccess ? 'Preview' : 'Firestore'}
          </span>
        </div>

        {/* Security, Reset Email & Password Section */}
        <div className="bg-[#0e131e] rounded-2xl border border-white/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#afc6ff] text-lg">lock_reset</span>
              <div>
                <h4 className="text-xs font-bold text-[#dee2f2]">Security & Reset Email</h4>
                <p className="text-[10px] text-[#c2c6d7]">Manage email address & password</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSecuritySection(!showSecuritySection);
                setEmailError(null);
                setEmailSuccess(null);
                setPasswordError(null);
                setPasswordSuccess(null);
              }}
              className="text-xs font-bold text-[#afc6ff] hover:text-white bg-[#528dff]/15 hover:bg-[#528dff]/25 px-3 py-1.5 rounded-xl border border-[#afc6ff]/30 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>{showSecuritySection ? 'Close' : 'Reset Email / Pass'}</span>
              <span className="material-symbols-outlined text-sm">
                {showSecuritySection ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {showSecuritySection && (
            <div className="pt-3 border-t border-white/10 space-y-3.5 animate-in fade-in duration-200">
              {/* Tab Selector: Reset Email vs Reset Password */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#151926] rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setSecurityTab('email');
                    setEmailError(null);
                    setEmailSuccess(null);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    securityTab === 'email'
                      ? 'bg-[#528dff] text-[#00275f] shadow-sm'
                      : 'text-[#c2c6d7] hover:text-[#dee2f2]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">mail</span>
                  <span>Reset Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecurityTab('password');
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    securityTab === 'password'
                      ? 'bg-[#528dff] text-[#00275f] shadow-sm'
                      : 'text-[#c2c6d7] hover:text-[#dee2f2]'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">key</span>
                  <span>Reset Password</span>
                </button>
              </div>

              {effectiveEmail ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-[#c2c6d7] leading-relaxed">
                    Active account: <strong className="text-[#dee2f2]">{effectiveEmail}</strong>
                  </p>
                  {isAdmin && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-400 text-base">shield</span>
                        <div>
                          <p className="text-[11px] font-bold text-emerald-300">Two-Factor Authentication Active</p>
                          <p className="text-[10px] text-emerald-200/80">Protected by mandatory 6-digit OTP verification.</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono-tag bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold uppercase">
                        2FA Active
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  You are currently using Quick Access mode. To link a permanent email address, you can set your email below.
                </p>
              )}

              {/* TAB 1: RESET / UPDATE EMAIL */}
              {securityTab === 'email' && (
                <div className="space-y-3">
                  {emailSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-emerald-400 shrink-0 mt-0.5">check_circle</span>
                      <span className="leading-relaxed">{emailSuccess}</span>
                    </div>
                  )}

                  {emailError && (
                    <div className="p-3 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/35 text-[#ffb4ab] text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-[#ffb4ab] shrink-0 mt-0.5">error</span>
                      <span className="leading-relaxed">{emailError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdateEmail} className="space-y-2.5">
                    {!effectiveEmail && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                          Current Email
                        </label>
                        <input
                          type="email"
                          required
                          placeholder="Current registered email"
                          value={currentEmailInput}
                          onChange={(e) => setCurrentEmailInput(e.target.value)}
                          className="w-full bg-[#1b1f2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                        New Email Address
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. yourname@domain.edu.ph"
                        value={newEmailInput}
                        onChange={(e) => setNewEmailInput(e.target.value)}
                        className="w-full bg-[#1b1f2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={emailLoading}
                        className="flex-1 py-2 rounded-xl bg-[#528dff] hover:bg-[#a9c7ff] text-[#00275f] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {emailLoading ? (
                          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">mark_email_read</span>
                            <span>Update / Reset Email</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={emailLoading}
                        onClick={handleSendResetEmailOnly}
                        className="py-2 px-3 rounded-xl bg-[#252a36] hover:bg-[#32394a] text-[#dee2f2] font-semibold text-xs border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Send reset / verification link"
                      >
                        <span className="material-symbols-outlined text-sm text-[#afc6ff]">send</span>
                        <span>Send Link</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: RESET PASSWORD */}
              {securityTab === 'password' && (
                <div className="space-y-3">
                  {passwordSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-emerald-400 shrink-0 mt-0.5">check_circle</span>
                      <span className="leading-relaxed">{passwordSuccess}</span>
                    </div>
                  )}

                  {passwordError && (
                    <div className="p-3 rounded-xl bg-[#93000a]/20 border border-[#ffb4ab]/35 text-[#ffb4ab] text-xs flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-[#ffb4ab] shrink-0 mt-0.5">error</span>
                      <span className="leading-relaxed">{passwordError}</span>
                    </div>
                  )}

                  <form onSubmit={handleUpdatePassword} className="space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          placeholder="Min. 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-[#1b1f2b] border border-white/10 rounded-xl pl-3 pr-10 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c2c6d7] hover:text-[#afc6ff] cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-sm">
                            {showNewPassword ? 'visibility_off' : 'visibility'}
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                        Confirm New Password
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        required
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-[#1b1f2b] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={passwordLoading}
                        className="flex-1 py-2 rounded-xl bg-[#528dff] hover:bg-[#a9c7ff] text-[#00275f] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {passwordLoading ? (
                          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">save</span>
                            <span>Update Password</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={passwordLoading}
                        onClick={handleSendPasswordResetEmail}
                        className="py-2 px-3 rounded-xl bg-[#252a36] hover:bg-[#32394a] text-[#dee2f2] font-semibold text-xs border border-white/10 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        title="Send a recovery link to your registered email"
                      >
                        <span className="material-symbols-outlined text-sm text-[#afc6ff]">mail</span>
                        <span>Send Link</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Access Upgrade Callout */}
        {(isAnonymous || isQuickAccess || !userEmail) && onPromptRegister && (
          <div className="bg-amber-500/15 border border-amber-500/35 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
              <span className="material-symbols-outlined text-base">bolt</span>
              <span>Quick Access Mode Limitations</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              You are currently using the app in Quick Access Mode (limit: 1 event log; Quiet Room locked). Register for an account to unlock all features.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onPromptRegister();
              }}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 hover:opacity-95 text-black font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">how_to_reg</span>
              <span>Register for Full Access</span>
            </button>
          </div>
        )}

        {/* Pending Admin Notice */}
        {stats.role === 'pending_admin' && (
          <div className="bg-amber-500/15 border border-amber-500/35 rounded-xl p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <span className="material-symbols-outlined text-base">hourglass_top</span>
              <span>Admin Application Pending</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Your request for Administrator access is currently awaiting approval by the Super Admin in the Admin Console.
            </p>
          </div>
        )}

        {/* Admin Access Controls */}
        {isAdmin && onOpenAdmin && (
          <button
            onClick={() => {
              onOpenAdmin();
              onClose();
            }}
            className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">admin_panel_settings</span>
            <span>Open Administrator Dashboard</span>
          </button>
        )}

        {/* Action Controls */}
        <div className="pt-2 flex flex-col gap-2">
          {showConfirmReset ? (
            <div className="bg-[#93000a]/20 border border-[#ffb4ab]/40 rounded-2xl p-4 text-center space-y-3">
              <p className="text-sm text-[#ffb4ab]">
                Are you sure? This will restore all initial sample events, burnout entries, and battery levels in your cloud database.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmReset(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#c2c6d7] hover:bg-[#252a36] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onResetData();
                    setShowConfirmReset(false);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#ffb4ab] text-[#690005] hover:bg-[#ffdad6] transition-all cursor-pointer"
                >
                  Yes, Reset Data
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmReset(true)}
              className="w-full border border-[#ffb4ab]/30 text-[#ffb4ab] hover:bg-[#93000a]/20 py-2.5 rounded-xl font-medium text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Reset Sample Data</span>
            </button>
          )}

          {onSignOut && (
            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full bg-[#252a36] hover:bg-[#2e3444] text-[#dee2f2] border border-white/10 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
