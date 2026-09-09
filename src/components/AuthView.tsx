import React, { useState, useEffect, useRef } from 'react';
import {
  registerAccountWithCredentials,
  signInWithCredentials,
  signInWithPopup,
  auth,
  googleProvider,
  signInAsGuest,
  recordUserRegistrationInDb,
  resetUserPassword,
  sendPasswordResetOtp,
  verifyPasswordResetOtp,
  completePasswordResetWithToken,
  checkIfEmailIsAdmin,
  initiateAdminTwoFactorVerification,
  resendAdminTwoFactorCode,
  verifyAdminTwoFactorAndSignIn,
  PRIMARY_ADMIN_EMAIL,
} from '../lib/firebase';
import { UserRole } from '../types';

interface AuthViewProps {
  onSuccess?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'admin' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Password Reset Multi-Step State
  // Step 1: 'request' -> user enters email, new password is not shown
  // Step 2: 'otp' -> user enters 6-digit OTP code sent to email
  // Step 3: 'new_password' -> only prompted after confirmation of reset
  const [resetStep, setResetStep] = useState<'request' | 'otp' | 'new_password'>('request');
  const [resetOtpDigits, setResetOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetChallengeCode, setResetChallengeCode] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [resetExpiresInSeconds, setResetExpiresInSeconds] = useState(300);
  const [resetResendCooldown, setResetResendCooldown] = useState(0);
  const resetDigitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Two-Factor Authentication (2FA) for Admin State
  const [isTwoFactorStep, setIsTwoFactorStep] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [twoFactorDigits, setTwoFactorDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [currentChallengeCode, setCurrentChallengeCode] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [expiresInSeconds, setExpiresInSeconds] = useState(300);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const digitInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const logoUrl =
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAGYxFW9lopaQeb_W9t_VKNf5BKzl5Rjire3Z83YQFACQEUGw_TRqNmG8Whb1nLvy9B-BOBqIRwu5cGl8GbH_jhDqi4bBYxu_C1x2GcwkpoW226xxTx8tvVYacs4xbUiXMuqS7EGIweLTBNBNpbzNDIRNEkcAtMJour2N4x7KDo89sn3xqT0ikRH8UZ8KuqDT_R17zufXTKPqQZKv3tJpK-4wBXQ4hqhnX3CX9irQu2sPFIYn6eWeovKc-YptG5uMxlWA';

  // 2FA Expiry & Resend Cooldown Countdown
  useEffect(() => {
    let timer: any;
    if (isTwoFactorStep) {
      timer = setInterval(() => {
        setExpiresInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTwoFactorStep]);

  // Reset OTP Expiry & Resend Cooldown Countdown
  useEffect(() => {
    let timer: any;
    if (mode === 'reset' && resetStep === 'otp') {
      timer = setInterval(() => {
        setResetExpiresInSeconds((prev) => (prev > 0 ? prev - 1 : 0));
        setResetResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [mode, resetStep]);

  // Focus first digit box when entering 2FA step
  useEffect(() => {
    if (isTwoFactorStep && digitInputRefs.current[0]) {
      digitInputRefs.current[0].focus();
    }
  }, [isTwoFactorStep]);

  // Focus first digit box when entering Reset OTP step
  useEffect(() => {
    if (mode === 'reset' && resetStep === 'otp' && resetDigitInputRefs.current[0]) {
      resetDigitInputRefs.current[0].focus();
    }
  }, [mode, resetStep]);

  const maskEmail = (str: string) => {
    if (!str || !str.includes('@')) return str;
    const [name, domain] = str.split('@');
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  };

  // Check email on blur to redirect if it is registered as an admin
  const handleEmailBlur = async () => {
    if (mode === 'signin' && email.trim()) {
      const clean = email.trim();
      const isAdmin = await checkIfEmailIsAdmin(clean);
      if (isAdmin) {
        setError('User has been detected to be an Administrator. Please sign in using the Admin tab.');
        setSuccessNotice(null);
      }
    }
  };

  // Main Email Auth / Submission Handler
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setLoading(true);

    const isRegistering = mode === 'signup';
    const isResetting = mode === 'reset';
    const isAdminMode = mode === 'admin';
    const targetEmail = email.trim();

    try {
      // 1. Password Reset Multi-Step Flow
      if (isResetting) {
        if (!targetEmail) {
          setError('Please enter your current registered email address.');
          setLoading(false);
          return;
        }

        if (resetStep === 'request') {
          // Step 1: Send OTP and reset link without prompting for new password
          const res = await sendPasswordResetOtp(targetEmail);
          setResetChallengeCode(res.code);
          setResetExpiresInSeconds(300);
          setResetResendCooldown(30);
          setResetOtpDigits(['', '', '', '', '', '']);
          setResetStep('otp');
          setSuccessNotice(res.message);
          setLoading(false);
          return;
        }

        if (resetStep === 'new_password') {
          // Step 3: Complete reset with confirmed token
          if (!newPassword || newPassword.length < 6) {
            setError('New password must be at least 6 characters.');
            setLoading(false);
            return;
          }
          if (confirmNewPassword && newPassword !== confirmNewPassword) {
            setError('Passwords do not match. Please verify.');
            setLoading(false);
            return;
          }

          const res = await completePasswordResetWithToken(targetEmail, resetToken, newPassword);
          setSuccessNotice(res.message);
          setPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
          setResetStep('request');
          setLoading(false);
          return;
        }
      }

      // 2. Sign Up Mode
      if (isRegistering) {
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

        if (onSuccess) onSuccess();
      } else {
        // 3. Sign In Mode (Member or Admin)
        if (!targetEmail || !password) {
          setError('Please enter your email and password.');
          setLoading(false);
          return;
        }

        // Check if the email is registered as an admin
        const isAdminDetected = await checkIfEmailIsAdmin(targetEmail);

        if (!isAdminMode && isAdminDetected) {
          setError('User has been detected to be an Administrator. Please sign in using the Admin tab.');
          setLoading(false);
          return;
        }

        if (isAdminMode) {
          // Trigger Admin Two-Factor Verification Challenge
          const challenge = await initiateAdminTwoFactorVerification({
            email: targetEmail,
            password,
          });

          setTwoFactorEmail(targetEmail);
          setTwoFactorPassword(password);
          setCurrentChallengeCode(challenge.code);
          setTwoFactorDigits(['', '', '', '', '', '']);
          setExpiresInSeconds(300); // 5 minutes
          setResendCooldown(30); // 30 seconds
          setIsTwoFactorStep(true);
          setLoading(false);
          return;
        }

        // Regular Member sign-in
        await signInWithCredentials({
          email: targetEmail,
          password,
        });

        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/invalid-login-credentials' ||
        err.message?.toLowerCase().includes('password')
      ) {
        if (mode === 'admin') {
          setError('Incorrect administrator password. Access denied. Please check your credentials or reset your password.');
        } else {
          setError('Incorrect password. Sign-in rejected. Please check your password or use "Forgot Password / Reset Email".');
        }
        setPassword('');
      } else if (err.code === 'auth/user-not-found' || err.message?.toLowerCase().includes('no account found')) {
        setError('No account found with this email address. Please check your email or create a new account.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Password Reset: Handle OTP Code Verification
  const handleVerifyResetOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    const code = resetOtpDigits.join('');

    if (code.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (resetExpiresInSeconds <= 0) {
      setError('Verification code has expired. Please click Resend Code to request a fresh code.');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyPasswordResetOtp(email.trim(), code);
      setResetToken(res.resetToken);
      setResetStep('new_password');
      setSuccessNotice(res.message);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Password Reset: Resend OTP Code
  const handleResendResetOtp = async () => {
    if (resetResendCooldown > 0) return;
    setError(null);
    setLoading(true);
    try {
      const res = await sendPasswordResetOtp(email.trim());
      setResetChallengeCode(res.code);
      setResetExpiresInSeconds(300);
      setResetResendCooldown(30);
      setResetOtpDigits(['', '', '', '', '', '']);
      setSuccessNotice('A new 6-digit verification code has been dispatched to your email.');
      resetDigitInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill Reset Code Helper in Sandbox
  const handleAutoFillResetCode = () => {
    if (resetChallengeCode && resetChallengeCode.length === 6) {
      const digits = resetChallengeCode.split('');
      setResetOtpDigits(digits);
      resetDigitInputRefs.current[5]?.focus();
    }
  };

  // Handle digit typing & auto-focus in Reset OTP input
  const handleResetDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const nextDigits = [...resetOtpDigits];
      nextDigits[index] = '';
      setResetOtpDigits(nextDigits);
      return;
    }

    if (cleanVal.length > 1) {
      const nextDigits = [...resetOtpDigits];
      for (let i = 0; i < 6; i++) {
        if (i < cleanVal.length) {
          nextDigits[i] = cleanVal[i];
        }
      }
      setResetOtpDigits(nextDigits);
      const focusIndex = Math.min(cleanVal.length, 5);
      resetDigitInputRefs.current[focusIndex]?.focus();
      return;
    }

    const nextDigits = [...resetOtpDigits];
    nextDigits[index] = cleanVal[0];
    setResetOtpDigits(nextDigits);

    if (index < 5 && cleanVal) {
      resetDigitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleResetDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !resetOtpDigits[index] && index > 0) {
      resetDigitInputRefs.current[index - 1]?.focus();
    }
  };

  // Admin 2FA: Handle digit typing & auto-focus
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const nextDigits = [...twoFactorDigits];
      nextDigits[index] = '';
      setTwoFactorDigits(nextDigits);
      return;
    }

    if (cleanVal.length > 1) {
      const nextDigits = [...twoFactorDigits];
      for (let i = 0; i < 6; i++) {
        if (i < cleanVal.length) {
          nextDigits[i] = cleanVal[i];
        }
      }
      setTwoFactorDigits(nextDigits);
      const focusIndex = Math.min(cleanVal.length, 5);
      digitInputRefs.current[focusIndex]?.focus();
      return;
    }

    const nextDigits = [...twoFactorDigits];
    nextDigits[index] = cleanVal[0];
    setTwoFactorDigits(nextDigits);

    if (index < 5 && cleanVal) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !twoFactorDigits[index] && index > 0) {
      digitInputRefs.current[index - 1]?.focus();
    }
  };

  // Admin 2FA: Handle Complete Verification
  const handleVerifyTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const code = twoFactorDigits.join('');

    if (code.length < 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    if (expiresInSeconds <= 0) {
      setError('Verification code has expired. Please click Resend Code to request a fresh code.');
      return;
    }

    setTwoFactorLoading(true);
    try {
      await verifyAdminTwoFactorAndSignIn({
        email: twoFactorEmail,
        code,
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('2FA Verification Error:', err);
      setError(err.message || 'Invalid verification code. Please check and try again.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Admin 2FA: Resend Code
  const handleResendTwoFactorCode = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setTwoFactorLoading(true);
    try {
      const res = await resendAdminTwoFactorCode(twoFactorEmail);
      setCurrentChallengeCode(res.code);
      setExpiresInSeconds(300);
      setResendCooldown(30);
      setSuccessNotice('A new 6-digit verification code has been dispatched.');
      setTwoFactorDigits(['', '', '', '', '', '']);
      digitInputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification code.');
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Auto-fill test code helper for Admin 2FA
  const handleAutoFillCode = () => {
    if (currentChallengeCode && currentChallengeCode.length === 6) {
      const digits = currentChallengeCode.split('');
      setTwoFactorDigits(digits);
      digitInputRefs.current[5]?.focus();
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessNotice(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user) {
        await recordUserRegistrationInDb(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reliable Quick Guest Mode
  const handleGuestSignIn = async () => {
    setError(null);
    setSuccessNotice(null);
    setGuestLoading(true);
    try {
      await signInAsGuest();
    } catch (err: any) {
      console.error('Guest sign in error:', err);
      setError('Could not start guest session.');
    } finally {
      setGuestLoading(false);
    }
  };

  const isRegisterForm = mode === 'signup';
  const isResetForm = mode === 'reset';

  // Render Admin Two-Factor Verification Screen
  if (isTwoFactorStep) {
    const minutes = Math.floor(expiresInSeconds / 60);
    const seconds = expiresInSeconds % 60;
    const formattedTimer = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
        {/* Amber & Azure Security Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#528dff]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#171b27] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6 animate-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 p-3 border border-amber-500/30 shadow-lg flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-mono-tag font-bold uppercase tracking-wider mb-1.5">
                <span className="material-symbols-outlined text-xs">shield</span>
                <span>2FA Admin Verification</span>
              </div>
              <h2 className="text-xl font-bold text-[#dee2f2] tracking-tight">Two-Factor Authentication</h2>
              <p className="text-xs text-[#c2c6d7] mt-1 leading-relaxed">
                A 6-digit security verification code has been dispatched for administrator account:
              </p>
              <p className="text-xs font-semibold text-amber-300 mt-0.5 font-mono">
                {maskEmail(twoFactorEmail)}
              </p>
            </div>
          </div>

          {/* Code Dispatch Demo Banner / Helper */}
          <div className="bg-[#0e131e] border border-white/10 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#c2c6d7] flex items-center gap-1">
                <span className="material-symbols-outlined text-amber-400 text-sm">mark_email_read</span>
                <span>Security OTP Code:</span>
              </span>
              <span className="font-mono font-bold text-amber-300 tracking-widest text-sm bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {currentChallengeCode || '••••••'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
              <span className="text-[#c2c6d7]/70">Testing in sandbox environment</span>
              <button
                type="button"
                onClick={handleAutoFillCode}
                className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs">touch_app</span>
                <span>One-tap Auto-fill</span>
              </button>
            </div>
          </div>

          {/* Success Notice */}
          {successNotice && (
            <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-base text-emerald-400 shrink-0 mt-0.5">check_circle</span>
              <span className="leading-relaxed">{successNotice}</span>
            </div>
          )}

          {/* Error Notice */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          {/* 6-Digit Verification Inputs */}
          <form onSubmit={handleVerifyTwoFactor} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-mono-tag uppercase tracking-wider text-[#c2c6d7] text-center block">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-between gap-1.5 sm:gap-2">
                {twoFactorDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (digitInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={idx === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    className="w-11 sm:w-12 h-13 sm:h-14 text-center text-xl font-mono font-bold bg-[#0e131e] border border-amber-500/40 rounded-xl text-amber-200 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 transition-all shadow-inner"
                  />
                ))}
              </div>
            </div>

            {/* Timer & Resend Controls */}
            <div className="flex items-center justify-between text-xs text-[#c2c6d7] px-1">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <span className="material-symbols-outlined text-sm text-[#afc6ff]">schedule</span>
                <span className={expiresInSeconds <= 60 ? 'text-rose-400 font-bold' : 'text-[#dee2f2]'}>
                  Expires in {formattedTimer}
                </span>
              </span>

              <button
                type="button"
                disabled={resendCooldown > 0 || twoFactorLoading}
                onClick={handleResendTwoFactorCode}
                className="text-xs font-semibold text-[#afc6ff] hover:text-white disabled:opacity-50 disabled:hover:text-[#afc6ff] cursor-pointer hover:underline"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
            </div>

            {/* Verification Button */}
            <button
              type="submit"
              disabled={twoFactorLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-300 text-black shadow-lg shadow-amber-500/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {twoFactorLoading ? (
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">security</span>
                  <span>Verify Code & Access Console</span>
                </>
              )}
            </button>
          </form>

          {/* Cancel / Back Option */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => {
                setIsTwoFactorStep(false);
                setError(null);
                setSuccessNotice(null);
                setMode('admin');
              }}
              className="text-xs text-[#c2c6d7] hover:text-white transition-colors cursor-pointer"
            >
              ← Cancel & Return to Sign In
            </button>
          </div>

          <p className="text-[10px] text-[#c2c6d7]/60 text-center leading-relaxed">
            Multi-factor verification safeguards administrator privileges, preventing unauthorized access to telemetry and database records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      {/* Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#528dff]/10 rounded-full blur-[140px] pointer-events-none" />
      {mode === 'admin' && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[160px] pointer-events-none" />
      )}

      <div className="w-full max-w-md bg-[#171b27] border border-[#424754]/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#0e131e] p-2 border border-[#afc6ff]/30 shadow-lg flex items-center justify-center">
            <img src={logoUrl} alt="Social Battery Tracker" className="w-full h-full object-contain rounded-xl" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#dee2f2] tracking-tight">Social Battery Tracker</h1>
            <p className="text-xs font-mono-tag text-[#afc6ff] mt-1">Ebb & Flow • Energy & Burnout Cloud Sync</p>
          </div>
        </div>

        {/* Tab Selector (Sign In / Register / Admin) */}
        <div className="grid grid-cols-3 p-1 bg-[#0e131e] rounded-2xl border border-white/5 gap-1 text-center">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
              setSuccessNotice(null);
            }}
            className={`py-2 text-[11px] sm:text-xs font-semibold rounded-xl transition-all cursor-pointer truncate ${
              mode === 'signin'
                ? 'bg-[#252a36] text-[#afc6ff] shadow-sm border border-[#afc6ff]/20'
                : 'text-[#c2c6d7] hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
              setSuccessNotice(null);
            }}
            className={`py-2 text-[11px] sm:text-xs font-semibold rounded-xl transition-all cursor-pointer truncate ${
              mode === 'signup'
                ? 'bg-[#252a36] text-[#afc6ff] shadow-sm border border-[#afc6ff]/20'
                : 'text-[#c2c6d7] hover:text-white'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('admin');
              setError(null);
              setSuccessNotice(null);
            }}
            className={`py-2 text-[11px] sm:text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 truncate ${
              mode === 'admin'
                ? 'bg-amber-500/20 text-amber-300 shadow-sm border border-amber-500/40 font-bold'
                : 'text-amber-400/70 hover:text-amber-300'
            }`}
          >
            <span>👑</span>
            <span>Admin</span>
          </button>
        </div>

        {/* Admin Portal Header Banner */}
        {mode === 'admin' && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400 text-lg">admin_panel_settings</span>
                <span className="text-xs font-bold text-amber-300">Administrator Portal</span>
              </div>
              <span className="text-[10px] font-mono-tag bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">lock</span>
                <span>2FA Protected</span>
              </span>
            </div>

            <p className="text-[11px] text-amber-200/90 leading-relaxed">
              Administrator sign-in requires Two-Factor Authentication (2FA) verification to protect database records and telemetry logs.
            </p>
          </div>
        )}

        {/* Password Reset Header Banner */}
        {mode === 'reset' && (
          <div className="bg-[#528dff]/10 border border-[#528dff]/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#afc6ff] text-lg">lock_reset</span>
                <span className="text-xs font-bold text-[#dee2f2]">Reset Account Password</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setResetStep('request');
                  setError(null);
                  setSuccessNotice(null);
                }}
                className="text-[10px] font-mono-tag text-[#afc6ff] hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>

            <p className="text-[11px] text-[#c2c6d7] leading-relaxed">
              {resetStep === 'request'
                ? 'Enter your registered email address to receive a secure 6-digit OTP verification code.'
                : resetStep === 'otp'
                ? 'Enter the 6-digit verification code sent to your email.'
                : 'Account verified. Enter your new password below.'}
            </p>
          </div>
        )}

        {/* Success Alert */}
        {successNotice && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-200 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-base text-emerald-400 shrink-0 mt-0.5">check_circle</span>
            <div className="space-y-1">
              <p className="leading-relaxed font-medium">{successNotice}</p>
              {mode === 'reset' && resetStep === 'request' && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setSuccessNotice(null);
                  }}
                  className="text-[11px] font-bold text-emerald-300 underline cursor-pointer hover:text-white"
                >
                  Proceed to Sign In →
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* --- PASSWORD RESET: STEP 2 (OTP VERIFICATION) --- */}
        {mode === 'reset' && resetStep === 'otp' ? (
          <div className="space-y-5">
            {/* Code Helper / Demo Banner */}
            <div className="bg-[#0e131e] border border-white/10 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#c2c6d7] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[#afc6ff] text-sm">mark_email_read</span>
                  <span>Sent to {maskEmail(email)}:</span>
                </span>
                <span className="font-mono font-bold text-[#afc6ff] tracking-widest text-sm bg-[#528dff]/10 px-2 py-0.5 rounded border border-[#528dff]/30">
                  {resetChallengeCode || '••••••'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                <span className="text-[#c2c6d7]/70">Testing in sandbox environment</span>
                <button
                  type="button"
                  onClick={handleAutoFillResetCode}
                  className="text-[#afc6ff] hover:text-white font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">touch_app</span>
                  <span>One-tap Auto-fill</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleVerifyResetOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-mono-tag uppercase tracking-wider text-[#c2c6d7] text-center block">
                  Enter 6-Digit OTP Code
                </label>
                <div className="flex justify-between gap-1.5 sm:gap-2">
                  {resetOtpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (resetDigitInputRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={idx === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleResetDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleResetDigitKeyDown(idx, e)}
                      className="w-11 sm:w-12 h-13 sm:h-14 text-center text-xl font-mono font-bold bg-[#0e131e] border border-[#528dff]/40 rounded-xl text-[#dee2f2] focus:outline-none focus:border-[#afc6ff] focus:ring-2 focus:ring-[#528dff]/20 transition-all shadow-inner"
                    />
                  ))}
                </div>
              </div>

              {/* Timer & Resend */}
              <div className="flex items-center justify-between text-xs text-[#c2c6d7] px-1">
                <span className="flex items-center gap-1 font-mono text-[11px]">
                  <span className="material-symbols-outlined text-sm text-[#afc6ff]">schedule</span>
                  <span className={resetExpiresInSeconds <= 60 ? 'text-rose-400 font-bold' : 'text-[#dee2f2]'}>
                    Expires in {Math.floor(resetExpiresInSeconds / 60).toString().padStart(2, '0')}:
                    {(resetExpiresInSeconds % 60).toString().padStart(2, '0')}
                  </span>
                </span>

                <button
                  type="button"
                  disabled={resetResendCooldown > 0 || loading}
                  onClick={handleResendResetOtp}
                  className="text-xs font-semibold text-[#afc6ff] hover:text-white disabled:opacity-50 disabled:hover:text-[#afc6ff] cursor-pointer hover:underline"
                >
                  {resetResendCooldown > 0 ? `Resend in ${resetResendCooldown}s` : 'Resend code'}
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setResetStep('request');
                    setError(null);
                  }}
                  className="py-3 px-4 rounded-xl bg-[#252a36] hover:bg-[#32394a] text-[#dee2f2] font-semibold text-xs border border-white/10 transition-all cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#528dff] to-[#afc6ff] text-[#002d6d] shadow-lg shadow-[#528dff]/20 hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      <span>Verify Code & Continue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* --- STANDARD AUTH & RESET FORM --- */
          <form onSubmit={handleEmailAuth} autoComplete="off" className="space-y-4">
            {isRegisterForm && (
              <div className="space-y-1">
                <label className="text-[11px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                  Full Name / Display Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] text-lg">
                    badge
                  </span>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="e.g. Alex Morgan"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#0e131e] border border-[#424754]/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dee2f2] focus:outline-none focus:border-[#afc6ff] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email Address Input (Shown in all modes except when already verified for new password) */}
            {!(mode === 'reset' && resetStep === 'new_password') && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                    Email Address
                  </label>
                  {mode === 'admin' && (
                    <span className="text-[10px] font-mono-tag text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                      Super Admin
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] text-lg">
                    {mode === 'admin' ? 'shield_person' : 'mail'}
                  </span>
                  <input
                    type="email"
                    required
                    autoComplete="off"
                    placeholder={
                      mode === 'admin'
                        ? 'Enter admin email'
                        : 'Enter your email'
                    }
                    value={email}
                    onBlur={handleEmailBlur}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full bg-[#0e131e] border rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dee2f2] focus:outline-none transition-all ${
                      mode === 'admin'
                        ? 'border-amber-500/40 focus:border-amber-400'
                        : 'border-[#424754]/40 focus:border-[#afc6ff]'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Standard Password field (in signin / signup / admin) */}
            {!isResetForm && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                    Password
                  </label>
                  {mode !== 'signup' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('reset');
                        setResetStep('request');
                        setError(null);
                        setSuccessNotice(null);
                      }}
                      className="text-[11px] text-[#afc6ff] hover:underline cursor-pointer transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] text-lg">
                    lock
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="off"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full bg-[#0e131e] border rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#dee2f2] focus:outline-none transition-all ${
                      mode === 'admin'
                        ? 'border-amber-500/40 focus:border-amber-400'
                        : 'border-[#424754]/40 focus:border-[#afc6ff]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] hover:text-[#afc6ff] transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* PASSWORD RESET: STEP 3 (ONLY SHOWN AFTER OTP HAS BEEN CONFIRMED) */}
            {isResetForm && resetStep === 'new_password' && (
              <div className="space-y-3.5 animate-in fade-in-50 duration-200">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-emerald-400">verified</span>
                  <span>Identity confirmed for <strong>{maskEmail(email)}</strong>. Set your new password:</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                    New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] text-lg">
                      key
                    </span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      placeholder="Enter new password (min. 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#0e131e] border border-[#424754]/40 rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#dee2f2] focus:outline-none focus:border-[#afc6ff] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] hover:text-[#afc6ff] transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">
                        {showNewPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tag uppercase tracking-wider text-[#c2c6d7]">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c2c6d7] text-lg">
                      lock_reset
                    </span>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      placeholder="Re-enter new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="w-full bg-[#0e131e] border border-[#424754]/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#dee2f2] focus:outline-none focus:border-[#afc6ff] transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-bold text-sm hover:opacity-95 active:scale-[0.99] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                  mode === 'admin'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-300 text-black shadow-amber-500/20'
                    : 'bg-gradient-to-r from-[#528dff] to-[#afc6ff] text-[#002d6d] shadow-[#528dff]/20'
                }`}
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">
                      {mode === 'admin'
                        ? 'shield'
                        : mode === 'signin'
                        ? 'login'
                        : mode === 'reset' && resetStep === 'new_password'
                        ? 'save'
                        : mode === 'reset'
                        ? 'send'
                        : 'how_to_reg'}
                    </span>
                    <span>
                      {mode === 'admin'
                        ? 'Continue to 2FA Verification →'
                        : mode === 'signin'
                        ? 'Sign In to Tracker'
                        : mode === 'reset' && resetStep === 'new_password'
                        ? 'Save New Password & Complete'
                        : mode === 'reset'
                        ? 'Send 6-Digit OTP & Reset Link'
                        : 'Create Account & Cloud Database'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Divider & Quick Access (only in signin/signup modes) */}
        {mode !== 'reset' && (
          <>
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#171b27] px-3 text-[11px] font-mono-tag uppercase text-[#c2c6d7]">
                quick access options
              </span>
            </div>

            {/* Alternative Sign-in options */}
            <div className="space-y-2.5">
              {/* Quick Guest Mode */}
              <button
                type="button"
                disabled={guestLoading}
                onClick={handleGuestSignIn}
                className="w-full py-3 px-4 rounded-xl bg-[#0e131e] hover:bg-[#1b1f2b] border-2 border-dashed border-[#528dff]/60 text-xs font-bold text-[#dee2f2] flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 shadow-md"
              >
                {guestLoading ? (
                  <span className="material-symbols-outlined animate-spin text-base text-[#afc6ff]">
                    progress_activity
                  </span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg text-emerald-400">bolt</span>
                    <span className="text-[#dee2f2]">Quick Guest Mode</span>
                    <span className="font-mono-tag text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Instant Access
                    </span>
                  </>
                )}
              </button>

              {/* Google Sign In */}
              <button
                type="button"
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="w-full py-2.5 px-4 rounded-xl bg-[#252a36] hover:bg-[#2e3444] border border-white/10 text-xs font-semibold text-[#dee2f2] flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
          </>
        )}

        {mode === 'reset' && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setResetStep('request');
                setError(null);
                setSuccessNotice(null);
              }}
              className="text-xs text-[#afc6ff] hover:underline font-semibold cursor-pointer"
            >
              ← Return to Sign In
            </button>
          </div>
        )}

        {/* Footnote */}
        <p className="text-[11px] text-[#c2c6d7]/70 text-center leading-relaxed">
          Your social battery telemetry, burnout logs, and presence status are secured and synchronized with Cloud Firestore.
        </p>
      </div>
    </div>
  );
};
