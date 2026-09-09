import React, { useState } from 'react';
import {
  registerAccountWithCredentials,
  signInWithCredentials,
  signInWithPopup,
  auth,
  googleProvider,
  recordUserRegistrationInDb,
} from '../lib/firebase';

interface RegisterPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'event_limit' | 'quiet_room' | 'recharge' | 'burnout' | 'general';
  onSuccess?: () => void;
}

export const RegisterPromptModal: React.FC<RegisterPromptModalProps> = ({
  isOpen,
  onClose,
  reason = 'general',
  onSuccess,
}) => {
  const [authMode, setAuthMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (!isOpen) return null;

  const reasonDetails = {
    event_limit: {
      title: 'Event Log Limit Reached',
      badge: 'Quick Access Limit: 1 Event',
      desc: 'In Quick Access Mode, you can only log 1 social event. Create a free account to log unlimited activities, track daily energy trends, and save your history to Cloud Firestore.',
      icon: 'lock_clock',
      color: 'from-amber-500 to-rose-500',
    },
    quiet_room: {
      title: 'Recharge Sanctuary Locked',
      badge: 'Members Feature',
      desc: 'The Recharge feature and Quiet Room guided breathing sanctuary require an account. Register now to restore +20% social battery and unlock all mindfulness tools.',
      icon: 'lock',
      color: 'from-[#528dff] to-[#afc6ff]',
    },
    recharge: {
      title: 'Recharge Feature Locked',
      badge: 'Members Feature',
      desc: 'Recharging your battery requires a registered account. Please create an account or sign in to access guided recharge sessions and restore +20% battery.',
      icon: 'lock',
      color: 'from-[#528dff] to-[#afc6ff]',
    },
    burnout: {
      title: 'Burnout & Quiet Room Locked',
      badge: 'Members Feature',
      desc: 'The Burnout recovery logs and Quiet Room sanctuary require an account. Register now to log quiet reflections, monitor recovery boundaries, and access the guided recharge tools.',
      icon: 'lock',
      color: 'from-[#528dff] to-[#afc6ff]',
    },
    general: {
      title: 'Unlock Full Access',
      badge: 'Register Account',
      desc: 'Create an account to unlock unlimited event logs, the Quiet Room recharge sanctuary, multi-device cloud synchronization, and burnout insights.',
      icon: 'stars',
      color: 'from-[#528dff] to-emerald-400',
    },
  }[reason];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const targetEmail = email.trim();

    try {
      if (authMode === 'signup') {
        if (!targetEmail || !password) {
          setError('Please provide both email and password.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }

        await registerAccountWithCredentials({
          email: targetEmail,
          password,
          displayName: displayName.trim() || targetEmail.split('@')[0],
        });
      } else {
        if (!targetEmail || !password) {
          setError('Please enter your email and password.');
          setLoading(false);
          return;
        }

        await signInWithCredentials({
          email: targetEmail,
          password,
        });
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Registration/Sign in modal error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please switch to Sign In below.');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password or email credentials.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        await recordUserRegistrationInDb(result.user);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#171b27] border border-[#afc6ff]/30 w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#528dff]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#afc6ff] text-2xl">
                {reasonDetails.icon}
              </span>
              <h2 className="text-xl font-bold text-[#dee2f2]">{reasonDetails.title}</h2>
            </div>
            <span className="inline-block text-[10px] font-mono-tag uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300">
              {reasonDetails.badge}
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-[#252a36] text-[#c2c6d7] hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Reason Explanation Card */}
        <div className="bg-[#0e131e] border border-white/5 rounded-2xl p-3.5 text-xs text-[#c2c6d7] leading-relaxed relative z-10 space-y-2">
          <p>{reasonDetails.desc}</p>
          <div className="grid grid-cols-2 gap-2 pt-1 font-mono-tag text-[10px] text-[#afc6ff]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
              <span>Unlimited Event Logs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
              <span>Quiet Room Sanctuary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
              <span>Cloud Firestore Sync</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs text-emerald-400">check_circle</span>
              <span>Burnout History & Insights</span>
            </div>
          </div>
        </div>

        {/* Tab Toggle: Sign Up / Sign In */}
        <div className="grid grid-cols-2 p-1 bg-[#0e131e] rounded-xl border border-white/5 gap-1 text-center relative z-10">
          <button
            type="button"
            onClick={() => {
              setAuthMode('signup');
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === 'signup'
                ? 'bg-[#252a36] text-[#afc6ff] border border-[#afc6ff]/30 shadow-sm'
                : 'text-[#c2c6d7] hover:text-white'
            }`}
          >
            Create Free Account
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('signin');
              setError(null);
            }}
            className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              authMode === 'signin'
                ? 'bg-[#252a36] text-[#afc6ff] border border-[#afc6ff]/30 shadow-sm'
                : 'text-[#c2c6d7] hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs flex items-start gap-2 relative z-10">
            <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 relative z-10">
          {authMode === 'signup' && (
            <div className="space-y-1">
              <label className="text-[10px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                Your Name
              </label>
              <input
                type="text"
                placeholder="e.g. Alex Morgan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#0e131e] border border-[#424754]/40 rounded-xl px-3.5 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0e131e] border border-[#424754]/40 rounded-xl px-3.5 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0e131e] border border-[#424754]/40 rounded-xl pl-3.5 pr-9 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-[#afc6ff]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#528dff] to-[#afc6ff] text-[#002d6d] font-bold text-xs shadow-lg shadow-[#528dff]/20 hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">
                  {authMode === 'signup' ? 'how_to_reg' : 'login'}
                </span>
                <span>{authMode === 'signup' ? 'Create Account & Unlock Full Features' : 'Sign In'}</span>
              </>
            )}
          </button>
        </form>

        {/* Google sign-in */}
        <div className="space-y-2 relative z-10 pt-1 border-t border-white/5">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleSignIn}
            className="w-full py-2 px-3 rounded-xl bg-[#0e131e] hover:bg-[#202534] border border-white/10 text-xs font-semibold text-[#dee2f2] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
