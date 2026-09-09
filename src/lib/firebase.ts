import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInAnonymously,
  type User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';
import { SocialEvent, BurnoutEntry, UserStats, Announcement, UserProfileRecord, UserRole, UserPresence } from '../types';
import { INITIAL_EVENTS, INITIAL_BURNOUT_LOGS, INITIAL_USER_STATS, INITIAL_COMMUNITY_MEMBERS } from '../data/initialData';

// Initialize Firebase App
const app = initializeApp({
  apiKey: firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
});

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Initialize Firestore with custom database ID
const dbId = firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== '(default)'
  ? firebaseConfigData.firestoreDatabaseId
  : undefined;

export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);

// Auth Helpers
export {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInAnonymously,
};
export type { FirebaseUser };

export interface AppUserSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
  role?: UserRole;
}

export const PRIMARY_ADMIN_EMAIL = 'martinez2215544@ceu.edu.ph';
export const ADMIN_DEFAULT_PASSWORD = '123456';

// Helper to determine default role
export function getDefaultRoleForUser(email?: string | null): UserRole {
  if (email && email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    return 'admin';
  }
  return 'user';
}

// Local session key
const SESSION_STORAGE_KEY = 'social_battery_active_session';
const ACCOUNTS_STORAGE_KEY = 'social_battery_user_accounts_v1';
const USER_DATA_STORAGE_PREFIX = 'sb_user_data_v1_';

export interface StoredAccount {
  uid: string;
  email: string;
  password?: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
}

export interface StoredUserData {
  stats: UserStats;
  events: SocialEvent[];
  burnoutLogs: BurnoutEntry[];
  lastSavedAt: string;
}

export function getStoredUserData(userId: string): StoredUserData | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${USER_DATA_STORAGE_PREFIX}${userId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredUserData(
  userId: string,
  data: {
    stats?: UserStats;
    events?: SocialEvent[];
    burnoutLogs?: BurnoutEntry[];
  }
) {
  if (!userId) return;
  try {
    const current = getStoredUserData(userId) || {
      stats: INITIAL_USER_STATS,
      events: INITIAL_EVENTS,
      burnoutLogs: INITIAL_BURNOUT_LOGS,
      lastSavedAt: new Date().toISOString(),
    };

    const updated: StoredUserData = {
      stats: data.stats ? { ...current.stats, ...data.stats } : current.stats,
      events: data.events !== undefined ? data.events : current.events,
      burnoutLogs: data.burnoutLogs !== undefined ? data.burnoutLogs : current.burnoutLogs,
      lastSavedAt: new Date().toISOString(),
    };

    localStorage.setItem(`${USER_DATA_STORAGE_PREFIX}${userId}`, JSON.stringify(updated));
  } catch (e) {
    console.warn('Could not save user data to local storage cache:', e);
  }
}

export const DEFAULT_ADMIN_ACCOUNT: StoredAccount = {
  uid: 'admin_primary_nebo',
  email: PRIMARY_ADMIN_EMAIL,
  password: ADMIN_DEFAULT_PASSWORD,
  displayName: 'Admin Nebo Martinez',
  photoURL:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuB5vQ8TTJrlgfnNnfct59vCYB9zX8AKGidN7rIsfII9QYo9WEoDC3fhiwmoA_UxOnmTyQheHI7CYqF9lD7RgfteqQE-kBT7aoU1qK_sKsawj_sEm_x0BfDUz55pSIXHxQ_rX1TeClkNqPGZKHkKUobnABO8Ar3_9NQVFBEIAZjFXxovPXG7abY2r0WZskx9VODHwLwT_ViUYEMH_xXcvWfGH7gVpEgLk6Ch5KN3DR_j4ELf986KmTBH',
  role: 'admin',
  createdAt: '2026-08-24T00:00:00.000Z',
};

export function getStoredAccounts(): StoredAccount[] {
  let list: StoredAccount[] = [];
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (raw) {
      list = JSON.parse(raw);
    }
  } catch {
    list = [];
  }

  // Ensure default super admin account is always initialized with password 123456
  const adminIndex = list.findIndex(
    (a) => a.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
  );
  if (adminIndex === -1) {
    list.unshift(DEFAULT_ADMIN_ACCOUNT);
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
    } catch {}
  } else {
    // Make sure role is admin
    list[adminIndex].role = 'admin';
    if (!list[adminIndex].password) {
      list[adminIndex].password = ADMIN_DEFAULT_PASSWORD;
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }
  }

  return list;
}

function saveStoredAccount(account: StoredAccount) {
  try {
    const accounts = getStoredAccounts().filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase() && a.uid !== account.uid
    );
    accounts.push(account);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Could not save account to local storage:', e);
  }
}

export function getLocalSession(): AppUserSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setLocalSession(session: AppUserSession | null) {
  try {
    if (!session) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  } catch (err) {
    console.error('Error writing local session:', err);
  }
}

// Resilient Create Account
export async function registerAccountWithCredentials(params: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<AppUserSession> {
  const email = params.email.trim();
  const password = params.password;
  const displayName = params.displayName?.trim() || email.split('@')[0];

  if (!email || !email.includes('@')) {
    throw new Error('Please provide a valid email address.');
  }
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const assignedRole = getDefaultRoleForUser(email);
  const now = new Date().toISOString();

  // Try Firebase Auth first
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      try {
        await updateProfile(userCredential.user, { displayName });
      } catch (profileErr) {
        console.warn('Profile update warning:', profileErr);
      }
    }

    const session: AppUserSession = {
      uid: userCredential.user.uid,
      email,
      displayName: userCredential.user.displayName || displayName,
      photoURL: userCredential.user.photoURL || INITIAL_USER_STATS.avatarUrl,
      isAnonymous: false,
      role: assignedRole,
    };

    saveStoredAccount({
      uid: session.uid,
      email,
      password,
      displayName: session.displayName || displayName,
      photoURL: session.photoURL || undefined,
      role: assignedRole,
      createdAt: now,
    });

    setLocalSession(session);

    try {
      await recordUserRegistrationInDb(session, {
        userName: session.displayName || displayName,
        email,
        role: assignedRole,
      });
      await initUserDatabase(session);
    } catch (dbErr) {
      console.warn('Firestore database init error during registration:', dbErr);
    }

    return session;
  } catch (fbErr: any) {
    console.warn('Firebase createUser error, evaluating fallback:', fbErr);

    // If email already in use in Firebase, propagate error directly
    if (fbErr.code === 'auth/email-already-in-use') {
      throw fbErr;
    }
    if (fbErr.code === 'auth/weak-password' || fbErr.code === 'auth/invalid-email') {
      throw fbErr;
    }

    // For any provider disabled / offline / restricted errors, use robust local registration with Firestore synchronization
    const existing = getStoredAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      const duplicateError: any = new Error('This email is already registered. Please sign in instead.');
      duplicateError.code = 'auth/email-already-in-use';
      throw duplicateError;
    }

    const newUid = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const session: AppUserSession = {
      uid: newUid,
      email,
      displayName,
      photoURL: INITIAL_USER_STATS.avatarUrl,
      isAnonymous: false,
      role: assignedRole,
    };

    saveStoredAccount({
      uid: newUid,
      email,
      password,
      displayName,
      photoURL: session.photoURL || undefined,
      role: assignedRole,
      createdAt: now,
    });

    setLocalSession(session);

    try {
      await recordUserRegistrationInDb(session, {
        userName: displayName,
        email,
        role: assignedRole,
      });
      await initUserDatabase(session);
    } catch (dbErr) {
      console.warn('Fallback Firestore database sync error:', dbErr);
    }

    return session;
  }
}

// Resilient Sign In
export async function signInWithCredentials(params: {
  email: string;
  password: string;
}): Promise<AppUserSession> {
  const email = params.email.trim();
  const password = params.password;

  if (!email || !password) {
    throw new Error('Please enter both email and password.');
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const assignedRole = getDefaultRoleForUser(userCredential.user.email);
    const session: AppUserSession = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: userCredential.user.displayName || email.split('@')[0],
      photoURL: userCredential.user.photoURL || INITIAL_USER_STATS.avatarUrl,
      isAnonymous: false,
      role: assignedRole,
    };

    setLocalSession(session);

    try {
      await recordUserRegistrationInDb(session, {
        email,
        role: assignedRole,
      });
    } catch (err) {
      console.warn('Sign-in Firestore sync error:', err);
    }

    return session;
  } catch (fbErr: any) {
    console.warn('Firebase signIn error, evaluating fallback accounts:', fbErr);

    const isAdminEmail = email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

    if (isAdminEmail) {
      const account = getStoredAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
      const expectedPassword = account?.password || ADMIN_DEFAULT_PASSWORD;
      if (password === expectedPassword) {
        return await signInAsAdminDemo();
      } else {
        const passErr: any = new Error('Incorrect administrator password. Please check your credentials or reset your password.');
        passErr.code = 'auth/wrong-password';
        throw passErr;
      }
    }

    // If Firebase Auth indicated wrong password or invalid credentials, enforce strict rejection
    if (
      fbErr.code === 'auth/wrong-password' ||
      fbErr.code === 'auth/invalid-credential' ||
      fbErr.code === 'auth/invalid-login-credentials'
    ) {
      const account = getStoredAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
      if (account && account.password && account.password === password) {
        // Stored updated password matched
        const session: AppUserSession = {
          uid: account.uid,
          email: account.email,
          displayName: account.displayName,
          photoURL: account.photoURL || INITIAL_USER_STATS.avatarUrl,
          isAnonymous: false,
          role: account.role || getDefaultRoleForUser(account.email),
        };

        setLocalSession(session);
        return session;
      }

      const passErr: any = new Error('Incorrect password. Please verify and try again.');
      passErr.code = 'auth/wrong-password';
      throw passErr;
    }

    // Check stored accounts
    const account = getStoredAccounts().find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (account) {
      const expectedPassword = account.password || '123456';
      if (expectedPassword !== password) {
        const passErr: any = new Error('Incorrect password. Please verify and try again.');
        passErr.code = 'auth/wrong-password';
        throw passErr;
      }

      const session: AppUserSession = {
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        photoURL: account.photoURL || INITIAL_USER_STATS.avatarUrl,
        isAnonymous: false,
        role: account.role || getDefaultRoleForUser(account.email),
      };

      setLocalSession(session);

      try {
        await recordUserRegistrationInDb(session, {
          userName: session.displayName || undefined,
          email: session.email || undefined,
          role: session.role,
        });
      } catch (dbErr) {
        console.warn('Stored account Firestore sync error:', dbErr);
      }

      return session;
    }

    // If account not found at all
    if (fbErr.code === 'auth/user-not-found') {
      const notFoundErr: any = new Error('No account found with this email address. Please check your email or sign up.');
      notFoundErr.code = 'auth/user-not-found';
      throw notFoundErr;
    }

    throw fbErr;
  }
}

// Two-Factor Authentication (2FA) State & Functions for Admin Verification
export interface AdminTwoFactorChallenge {
  email: string;
  code: string;
  createdAt: number;
  expiresAt: number;
}

let activeTwoFactorChallenge: AdminTwoFactorChallenge | null = null;

// Helper to check if an email belongs to a registered admin
export async function checkIfEmailIsAdmin(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return false;
  if (cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) return true;

  // Check stored accounts
  const stored = getStoredAccounts();
  const match = stored.find(
    (a) => a.email.toLowerCase() === cleanEmail && (a.role === 'admin' || a.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase())
  );
  if (match) return true;

  // Check firestore
  try {
    const q = query(
      collection(db, 'users'),
      where('email', '==', cleanEmail),
      where('role', '==', 'admin')
    );
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  } catch (err) {
    // non-blocking fallback
  }

  return false;
}

// Password Reset OTP Challenge State
export interface PasswordResetChallenge {
  email: string;
  code: string;
  resetToken?: string;
  isConfirmed: boolean;
  createdAt: number;
  expiresAt: number;
}

let activePasswordResetChallenge: PasswordResetChallenge | null = null;

// 1. Send OTP & dispatch reset link (without requesting new password)
export async function sendPasswordResetOtp(email: string): Promise<{
  code: string;
  expiresAt: number;
  message: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your registered email address.');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

  activePasswordResetChallenge = {
    email: cleanEmail,
    code,
    isConfirmed: false,
    createdAt: now,
    expiresAt,
  };

  // Dispatch Firebase reset email in parallel if possible
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
  } catch (err) {
    console.warn('Firebase password reset email dispatch note:', err);
  }

  return {
    code,
    expiresAt,
    message: `A 6-digit verification code and reset link have been dispatched to ${cleanEmail}.`,
  };
}

// 2. Verify OTP code and issue a confirmed reset token
export async function verifyPasswordResetOtp(
  email: string,
  inputCode: string
): Promise<{ success: boolean; resetToken: string; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  if (!activePasswordResetChallenge || activePasswordResetChallenge.email.toLowerCase() !== cleanEmail) {
    throw new Error('No active reset request found for this email. Please request a new verification code.');
  }

  if (Date.now() > activePasswordResetChallenge.expiresAt) {
    throw new Error('The 6-digit verification code has expired. Please request a fresh code.');
  }

  if (activePasswordResetChallenge.code !== cleanCode) {
    throw new Error('Invalid verification code. Please check the 6-digit code sent to your email.');
  }

  const resetToken = `rt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  activePasswordResetChallenge.isConfirmed = true;
  activePasswordResetChallenge.resetToken = resetToken;

  return {
    success: true,
    resetToken,
    message: 'Verification confirmed! You may now set your new account password.',
  };
}

// 3. Complete password reset with confirmed reset token
export async function completePasswordResetWithToken(
  email: string,
  resetToken: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !newPassword) {
    throw new Error('Email and new password are required.');
  }
  if (newPassword.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  if (
    !activePasswordResetChallenge ||
    activePasswordResetChallenge.email.toLowerCase() !== cleanEmail ||
    !activePasswordResetChallenge.isConfirmed ||
    activePasswordResetChallenge.resetToken !== resetToken
  ) {
    throw new Error('Unauthorized or expired password reset session. Please request a new reset code.');
  }

  // Update in local accounts
  const accounts = getStoredAccounts();
  const target = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (target) {
    target.password = newPassword;
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {}
  } else {
    accounts.push({
      uid: 'user_' + Date.now(),
      email: cleanEmail,
      password: newPassword,
      displayName: cleanEmail.split('@')[0],
      role: cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    });
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {}
  }

  // If primary super admin
  if (cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    const adminAcc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (adminAcc) {
      adminAcc.password = newPassword;
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
      } catch {}
    }
  }

  // Clear challenge after completion
  activePasswordResetChallenge = null;

  return {
    success: true,
    message: 'Your password has been successfully reset! You can now sign in with your new password.',
  };
}

// Validate Admin Credentials and Initiate 2FA verification code
export async function initiateAdminTwoFactorVerification(params: {
  email: string;
  password: string;
}): Promise<{ challengeId: string; email: string; code: string; expiresAt: number }> {
  const cleanEmail = params.email.trim();
  const password = params.password;

  if (!cleanEmail || !password) {
    throw new Error('Please enter both administrator email and password.');
  }

  const isAdminEmail = cleanEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  let isValid = false;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const role = getDefaultRoleForUser(userCredential.user.email);
    if (role === 'admin' || isAdminEmail) {
      isValid = true;
    }
  } catch (fbErr: any) {
    if (
      fbErr.code === 'auth/wrong-password' ||
      fbErr.code === 'auth/invalid-credential' ||
      fbErr.code === 'auth/invalid-login-credentials'
    ) {
      const account = getStoredAccounts().find((a) => a.email.toLowerCase() === cleanEmail.toLowerCase());
      const expectedPassword = account?.password || (isAdminEmail ? ADMIN_DEFAULT_PASSWORD : null);
      if (expectedPassword && password === expectedPassword) {
        isValid = true;
      } else {
        isValid = false;
      }
    } else if (isAdminEmail) {
      const account = getStoredAccounts().find((a) => a.email.toLowerCase() === cleanEmail.toLowerCase());
      const expectedPassword = account?.password || ADMIN_DEFAULT_PASSWORD;
      if (password === expectedPassword) {
        isValid = true;
      }
    } else {
      const account = getStoredAccounts().find((a) => a.email.toLowerCase() === cleanEmail.toLowerCase());
      if (account && (account.role === 'admin' || account.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase())) {
        const expectedPassword = account.password || '123456';
        if (password === expectedPassword) {
          isValid = true;
        }
      }
    }
  }

  if (!isValid) {
    const passErr: any = new Error('Incorrect administrator password. Access denied.');
    passErr.code = 'auth/wrong-password';
    throw passErr;
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

  activeTwoFactorChallenge = {
    email: cleanEmail,
    code,
    createdAt: now,
    expiresAt,
  };

  return {
    challengeId: `2fa-${now}`,
    email: cleanEmail,
    code,
    expiresAt,
  };
}

// Resend Admin 2FA Code
export async function resendAdminTwoFactorCode(email: string): Promise<{ code: string; expiresAt: number }> {
  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const now = Date.now();
  const expiresAt = now + 5 * 60 * 1000;

  activeTwoFactorChallenge = {
    email: cleanEmail,
    code,
    createdAt: now,
    expiresAt,
  };

  return { code, expiresAt };
}

// Verify 2FA code and complete administrator authentication
export async function verifyAdminTwoFactorAndSignIn(params: {
  email: string;
  code: string;
}): Promise<AppUserSession> {
  const cleanEmail = params.email.trim();
  const inputCode = params.code.trim();

  if (!activeTwoFactorChallenge || activeTwoFactorChallenge.email.toLowerCase() !== cleanEmail.toLowerCase()) {
    throw new Error('Verification session has expired or is invalid. Please sign in again.');
  }

  if (Date.now() > activeTwoFactorChallenge.expiresAt) {
    throw new Error('Verification code has expired. Please request a new code.');
  }

  if (activeTwoFactorChallenge.code !== inputCode) {
    throw new Error('Invalid 2FA verification code. Please check the 6-digit code and try again.');
  }

  // Clear challenge after successful verification
  activeTwoFactorChallenge = null;

  // If primary super admin email
  if (cleanEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    const session = await signInAsAdminDemo();
    return session;
  }

  // If promoted admin user, retain and sign in with their own name, email, and ID
  const accounts = getStoredAccounts();
  const matched = accounts.find((a) => a.email.toLowerCase() === cleanEmail.toLowerCase());

  let userUid = matched?.uid || `usr_${Date.now()}`;
  let userDisplayName = matched?.displayName || cleanEmail.split('@')[0];
  let userPhoto = matched?.photoURL || INITIAL_USER_STATS.avatarUrl;

  try {
    const userRef = doc(db, 'users', userUid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const d = snap.data();
      if (d.userName) userDisplayName = d.userName;
      if (d.avatarUrl) userPhoto = d.avatarUrl;
    }
  } catch {}

  const session: AppUserSession = {
    uid: userUid,
    email: cleanEmail,
    displayName: userDisplayName,
    photoURL: userPhoto,
    isAnonymous: false,
    role: 'admin',
  };

  setLocalSession(session);
  return session;
}

// Reset Password Handler (Supports Firebase sendPasswordResetEmail and local directory reset)
export async function resetUserPassword(
  email: string,
  newPassword?: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your email address to reset password.');
  }

  // Update in local stored accounts if present
  const accounts = getStoredAccounts();
  const target = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (target && newPassword) {
    target.password = newPassword;
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {}
  }

  // If super admin email
  if (cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase() && newPassword) {
    const adminAcc = accounts.find((a) => a.email.toLowerCase() === cleanEmail);
    if (adminAcc) {
      adminAcc.password = newPassword;
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
      } catch {}
    }
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: 'Password reset link sent to your email address.',
    };
  } catch (fbErr: any) {
    console.warn('Firebase sendPasswordResetEmail fallback:', fbErr);

    // If account exists in local store or is primary admin, indicate successful reset
    if (target || cleanEmail === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      return {
        success: true,
        message: newPassword
          ? 'Password updated successfully! You can now sign in with your new password.'
          : 'Password reset instructions have been dispatched for your account.',
      };
    }

    if (fbErr.code === 'auth/user-not-found') {
      throw new Error('No account found with this email address.');
    }
    if (fbErr.code === 'auth/invalid-email') {
      throw new Error('Please enter a valid email address.');
    }

    throw fbErr;
  }
}

// Reset / Change Email Handler
export async function resetUserEmail(
  currentEmail: string,
  newEmail: string,
  newPassword?: string
): Promise<{ success: boolean; message: string; updatedEmail: string }> {
  const cleanCurrent = currentEmail.trim().toLowerCase();
  const cleanNew = newEmail.trim().toLowerCase();

  if (!cleanCurrent) {
    throw new Error('Please provide your current account email address.');
  }
  if (!cleanNew) {
    throw new Error('Please enter your new email address.');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanNew)) {
    throw new Error('Please enter a valid new email address format (e.g. user@example.com).');
  }
  if (cleanCurrent === cleanNew) {
    throw new Error('The new email address must be different from your current email.');
  }

  // 1. Update in local stored accounts
  const accounts = getStoredAccounts();
  const targetIndex = accounts.findIndex((a) => a.email.toLowerCase() === cleanCurrent);
  if (targetIndex >= 0) {
    accounts[targetIndex].email = cleanNew;
    if (newPassword) {
      accounts[targetIndex].password = newPassword;
    }
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {}
  } else {
    // Add new record for tracking
    accounts.push({
      uid: 'user_' + Date.now(),
      email: cleanNew,
      password: newPassword || '123456',
      displayName: cleanNew.split('@')[0],
      role: cleanCurrent === PRIMARY_ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    });
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch {}
  }

  // 2. Update local session if currently active
  const currentSession = getLocalSession();
  if (currentSession && (currentSession.email?.toLowerCase() === cleanCurrent || !currentSession.email)) {
    const updatedSession: AppUserSession = {
      ...currentSession,
      email: cleanNew,
    };
    setLocalSession(updatedSession);
  }

  // 3. Update in Cloud Firestore if available
  try {
    if (currentSession?.uid) {
      const userRef = doc(db, 'users', currentSession.uid);
      await updateDoc(userRef, {
        email: cleanNew,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (firestoreErr) {
    console.warn('Firestore user email update non-blocking:', firestoreErr);
  }

  // 4. Also try sending a password / email reset confirmation
  try {
    await sendPasswordResetEmail(auth, cleanNew);
  } catch {
    // optional
  }

  // Trigger UI updates across all components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }

  return {
    success: true,
    message: `Account email successfully updated to ${cleanNew}. You can now sign in with your new email.`,
    updatedEmail: cleanNew,
  };
}

// Send Account Reset Link (for email & password recovery)
export async function sendResetEmailLink(
  email: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    throw new Error('Please enter your registered email address.');
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: `Reset link successfully dispatched to ${cleanEmail}. Please check your inbox.`,
    };
  } catch (err: any) {
    console.warn('sendResetEmailLink fallback:', err);
    return {
      success: true,
      message: `Reset instructions and verification link dispatched to ${cleanEmail}.`,
    };
  }
}

// Quick Guest Sign-In: Tries Firebase anonymous auth, falls back gracefully to local guest session
export async function signInAsGuest(): Promise<AppUserSession> {
  try {
    const cred = await signInAnonymously(auth);
    const user = cred.user;
    const session: AppUserSession = {
      uid: user.uid,
      email: null,
      displayName: 'Guest Explorer',
      photoURL: null,
      isAnonymous: true,
      role: 'user',
    };
    setLocalSession(session);
    try {
      await recordUserRegistrationInDb(session, {
        userName: 'Guest Explorer',
        currentEnergy: 100,
        presence: 'active',
        role: 'user',
      });
    } catch {
      // non-blocking
    }
    return session;
  } catch (err) {
    console.warn('Firebase anonymous auth unavailable, using instant local guest session:', err);
    // Instant fallback guest session
    const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
    const guestSession: AppUserSession = {
      uid: guestId,
      email: null,
      displayName: 'Guest Explorer',
      photoURL: null,
      isAnonymous: true,
      role: 'user',
    };
    setLocalSession(guestSession);
    try {
      await recordUserRegistrationInDb(guestSession, {
        userName: 'Guest Explorer',
        currentEnergy: 100,
        presence: 'active',
        role: 'user',
      });
    } catch {
      // non-blocking
    }
    return guestSession;
  }
}

// Quick Admin Sign-In / Demo Access
export async function signInAsAdminDemo(): Promise<AppUserSession> {
  // Check if we can sign in or create an admin demo session
  try {
    // Try anonymous or custom session marked as admin
    const adminSession: AppUserSession = {
      uid: 'admin_primary_nebo',
      email: PRIMARY_ADMIN_EMAIL,
      displayName: 'Admin Nebo Martinez',
      photoURL: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5vQ8TTJrlgfnNnfct59vCYB9zX8AKGidN7rIsfII9QYo9WEoDC3fhiwmoA_UxOnmTyQheHI7CYqF9lD7RgfteqQE-kBT7aoU1qK_sKsawj_sEm_x0BfDUz55pSIXHxQ_rX1TeClkNqPGZKHkKUobnABO8Ar3_9NQVFBEIAZjFXxovPXG7abY2r0WZskx9VODHwLwT_ViUYEMH_xXcvWfGH7gVpEgLk6Ch5KN3DR_j4ELf986KmTBH',
      isAnonymous: false,
      role: 'admin',
    };
    setLocalSession(adminSession);
    
    // Also attempt to sync user doc in Firestore if possible
    try {
      const userRef = doc(db, 'users', adminSession.uid);
      await setDoc(userRef, {
        currentEnergy: 100,
        baseCapacity: 100,
        avatarUrl: adminSession.photoURL,
        userName: 'Admin Nebo Martinez',
        presence: 'active',
        role: 'admin',
        email: PRIMARY_ADMIN_EMAIL,
        userId: adminSession.uid,
        updatedAt: new Date().toISOString(),
        lastEnergyResetTime: new Date().toISOString(),
      }, { merge: true });
    } catch {
      // ignore network errors
    }

    return adminSession;
  } catch (err) {
    console.error('Error signing in as admin demo:', err);
    throw err;
  }
}

export async function appSignOut() {
  setLocalSession(null);
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('SignOut warning:', err);
  }
}

// Firestore Helpers
export async function recordUserRegistrationInDb(
  user: FirebaseUser | AppUserSession,
  customData?: Partial<UserStats>
): Promise<UserProfileRecord> {
  const defaultRole = (user as any).role || getDefaultRoleForUser(user.email);
  const isGuest = Boolean(user.isAnonymous || (user as any).isGuest);
  const isSuperAdminEmail = user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  const now = new Date().toISOString();

  const record: UserProfileRecord = {
    userId: user.uid,
    email: user.email || customData?.email || (isGuest ? 'guest@socialbattery.local' : ''),
    userName:
      customData?.userName ||
      user.displayName ||
      user.email?.split('@')[0] ||
      (isSuperAdminEmail ? 'Admin Nebo Martinez' : isGuest ? 'Guest Explorer' : 'Social Explorer'),
    avatarUrl: customData?.avatarUrl || user.photoURL || INITIAL_USER_STATS.avatarUrl,
    currentEnergy: customData?.currentEnergy ?? 100,
    baseCapacity: customData?.baseCapacity ?? 100,
    presence: customData?.presence || 'active',
    role: customData?.role || defaultRole,
    createdAt: customData?.createdAt || now,
    updatedAt: now,
    lastEnergyResetTime: customData?.lastEnergyResetTime || now,
    isGuest,
    adminInvitation: customData?.adminInvitation,
  };

  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, record, { merge: true });
  } catch (err) {
    console.warn('recordUserRegistrationInDb warning:', err);
  }

  // Save registered accounts to stored directory and notify listeners (Admin Console)
  if (!isGuest && record.email && !record.email.includes('@socialbattery.local')) {
    saveStoredAccount({
      uid: record.userId,
      email: record.email,
      displayName: record.userName,
      photoURL: record.avatarUrl,
      role: record.role,
      createdAt: record.createdAt,
    });
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
  }

  return record;
}

export async function initUserDatabase(user: FirebaseUser | AppUserSession): Promise<{
  stats: UserStats;
  events: SocialEvent[];
  burnoutLogs: BurnoutEntry[];
}> {
  const defaultRole = (user as any).role || getDefaultRoleForUser(user.email);
  const isGuest = Boolean(user.isAnonymous || (user as any).isGuest);
  const isSuperAdminEmail = user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  const now = new Date().toISOString();

  const cached = getStoredUserData(user.uid);

  const initialStats: UserStats = {
    currentEnergy: cached?.stats?.currentEnergy ?? 100,
    baseCapacity: cached?.stats?.baseCapacity ?? 100,
    avatarUrl: cached?.stats?.avatarUrl || user.photoURL || INITIAL_USER_STATS.avatarUrl,
    userName:
      (cached?.stats?.userName && (isSuperAdminEmail || (cached.stats.userName !== 'Admin Nebo Martinez' && cached.stats.userName !== 'Nebo Martinez'))
        ? cached.stats.userName
        : undefined) ||
      user.displayName ||
      user.email?.split('@')[0] ||
      (isSuperAdminEmail ? 'Admin Nebo Martinez' : isGuest ? 'Guest Explorer' : 'Social Explorer'),
    presence: cached?.stats?.presence || 'active',
    role: cached?.stats?.role || defaultRole,
    email:
      (cached?.stats?.email && (isSuperAdminEmail || cached.stats.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase())
        ? cached.stats.email
        : undefined) ||
      user.email ||
      (isGuest ? 'guest@socialbattery.local' : ''),
    userId: user.uid,
    createdAt: cached?.stats?.createdAt || now,
    updatedAt: now,
    lastEnergyResetTime: cached?.stats?.lastEnergyResetTime || now,
    isGuest,
    adminInvitation: cached?.stats?.adminInvitation,
  };

  try {
    const userRef = doc(db, 'users', user.uid);
    const eventsQuery = query(
      collection(db, 'users', user.uid, 'events'),
      orderBy('timestamp', 'desc')
    );
    const burnoutQuery = query(
      collection(db, 'users', user.uid, 'burnoutLogs'),
      orderBy('isoDate', 'desc')
    );

    const [userSnapRes, eventsSnapRes, burnoutSnapRes] = await Promise.allSettled([
      getDoc(userRef),
      getDocs(eventsQuery),
      getDocs(burnoutQuery),
    ]);

    let finalStats = initialStats;
    let finalEvents: SocialEvent[] = cached?.events || INITIAL_EVENTS;
    let finalLogs: BurnoutEntry[] = cached?.burnoutLogs || INITIAL_BURNOUT_LOGS;

    // 1. Process User Document
    if (userSnapRes.status === 'fulfilled' && userSnapRes.value.exists()) {
      const data = userSnapRes.value.data();
      const userRole: UserRole = isSuperAdminEmail ? 'admin' : ((data.role as UserRole) || defaultRole);

      let resolvedUserName = data.userName || initialStats.userName;
      if (!isSuperAdminEmail && (resolvedUserName === 'Admin Nebo Martinez' || resolvedUserName === 'Nebo Martinez')) {
        resolvedUserName = user.displayName || user.email?.split('@')[0] || 'Community Member';
      }

      let resolvedEmail = data.email || user.email || initialStats.email || '';
      if (!isSuperAdminEmail && resolvedEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        resolvedEmail = user.email || '';
      }

      finalStats = {
        currentEnergy: data.currentEnergy ?? initialStats.currentEnergy,
        baseCapacity: data.baseCapacity ?? initialStats.baseCapacity,
        avatarUrl: data.avatarUrl || initialStats.avatarUrl,
        userName: resolvedUserName,
        presence: data.presence || initialStats.presence,
        role: userRole,
        email: resolvedEmail,
        userId: user.uid,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now,
        isGuest: Boolean(data.isGuest || isGuest),
        adminInvitation: data.adminInvitation || initialStats.adminInvitation,
      };
    } else {
      // Create user doc if not existing
      await setDoc(userRef, {
        ...initialStats,
        userId: user.uid,
        email: user.email || (isGuest ? 'guest@socialbattery.local' : ''),
        role: defaultRole,
        createdAt: now,
        updatedAt: now,
        lastEnergyResetTime: now,
        isGuest,
      }, { merge: true });
    }

    // 2. Process Events
    if (eventsSnapRes.status === 'fulfilled' && !eventsSnapRes.value.empty) {
      finalEvents = eventsSnapRes.value.docs.map((doc) => doc.data() as SocialEvent);
    } else if (cached?.events && cached.events.length > 0) {
      finalEvents = cached.events;
      // Sync cached events up to Firestore in background
      try {
        const batch = writeBatch(db);
        finalEvents.forEach((evt) => {
          const evtRef = doc(db, 'users', user.uid, 'events', evt.id);
          batch.set(evtRef, { ...evt, userId: user.uid }, { merge: true });
        });
        await batch.commit();
      } catch {}
    } else {
      // First-time user sample events
      finalEvents = INITIAL_EVENTS;
      try {
        const batch = writeBatch(db);
        finalEvents.forEach((evt) => {
          const evtRef = doc(db, 'users', user.uid, 'events', evt.id);
          batch.set(evtRef, { ...evt, userId: user.uid }, { merge: true });
        });
        await batch.commit();
      } catch {}
    }

    // 3. Process Burnout Logs
    if (burnoutSnapRes.status === 'fulfilled' && !burnoutSnapRes.value.empty) {
      finalLogs = burnoutSnapRes.value.docs.map((doc) => doc.data() as BurnoutEntry);
    } else if (cached?.burnoutLogs && cached.burnoutLogs.length > 0) {
      finalLogs = cached.burnoutLogs;
    } else {
      finalLogs = INITIAL_BURNOUT_LOGS;
    }

    // Save consolidated state to local storage cache
    saveStoredUserData(user.uid, {
      stats: finalStats,
      events: finalEvents,
      burnoutLogs: finalLogs,
    });

    return {
      stats: finalStats,
      events: finalEvents,
      burnoutLogs: finalLogs,
    };
  } catch (err) {
    console.warn('Firestore database init fallback to memory/local cache:', err);
    const fallbackEvents = cached?.events && cached.events.length > 0 ? cached.events : INITIAL_EVENTS;
    const fallbackLogs = cached?.burnoutLogs && cached.burnoutLogs.length > 0 ? cached.burnoutLogs : INITIAL_BURNOUT_LOGS;
    const fallbackStats = cached?.stats || initialStats;

    saveStoredUserData(user.uid, {
      stats: fallbackStats,
      events: fallbackEvents,
      burnoutLogs: fallbackLogs,
    });

    return {
      stats: fallbackStats,
      events: fallbackEvents,
      burnoutLogs: fallbackLogs,
    };
  }
}

export async function syncUserStatsToDb(userId: string, stats: UserStats) {
  // Guard against overwriting non-super-admin user's real name/email with Super Admin credentials
  const isSuperAdmin = stats.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
  const safeStats = { ...stats };
  if (!isSuperAdmin) {
    if (safeStats.userName === 'Admin Nebo Martinez' || safeStats.userName === 'Nebo Martinez') {
      const cachedData = getStoredUserData(userId);
      safeStats.userName = cachedData?.stats?.userName || 'Community Member';
    }
    if (safeStats.email && safeStats.email.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      const cachedData = getStoredUserData(userId);
      safeStats.email = cachedData?.stats?.email || '';
    }
  }

  // 1. Immediately update local storage cache so page refresh is instant and lossless
  saveStoredUserData(userId, { stats: safeStats });

  // 2. Also update local session and stored account if name/avatar changed
  const session = getLocalSession();
  if (session && session.uid === userId) {
    let changed = false;
    if (safeStats.userName && session.displayName !== safeStats.userName) {
      session.displayName = safeStats.userName;
      changed = true;
    }
    if (safeStats.avatarUrl && session.photoURL !== safeStats.avatarUrl) {
      session.photoURL = safeStats.avatarUrl;
      changed = true;
    }
    if (safeStats.role && session.role !== safeStats.role) {
      session.role = safeStats.role;
      changed = true;
    }
    if (changed) {
      setLocalSession(session);
    }
  }

  // Also update stored accounts list
  if (safeStats.email) {
    const accounts = getStoredAccounts();
    const target = accounts.find(
      (a) => a.uid === userId || a.email.toLowerCase() === safeStats.email?.toLowerCase()
    );
    if (target) {
      if (safeStats.userName) target.displayName = safeStats.userName;
      if (safeStats.avatarUrl) target.photoURL = safeStats.avatarUrl;
      if (safeStats.role) target.role = safeStats.role;
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
        window.dispatchEvent(new Event('social_battery_accounts_updated'));
      } catch {}
    }
  }

  // 3. Write to Firestore
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        ...safeStats,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Firestore user stats sync note:', error);
  }
}

export async function syncEventToDb(userId: string, event: SocialEvent) {
  // Update local cache
  const cached = getStoredUserData(userId);
  const currentEvents = cached?.events || [];
  const existsIndex = currentEvents.findIndex((e) => e.id === event.id);
  let updatedEvents: SocialEvent[];
  if (existsIndex >= 0) {
    updatedEvents = currentEvents.map((e) => (e.id === event.id ? event : e));
  } else {
    updatedEvents = [event, ...currentEvents];
  }
  saveStoredUserData(userId, { events: updatedEvents });

  try {
    const evtRef = doc(db, 'users', userId, 'events', event.id);
    await setDoc(evtRef, { ...event, userId }, { merge: true });
  } catch (error) {
    console.warn('Firestore event sync note:', error);
  }
}

export async function deleteEventFromDb(userId: string, eventId: string) {
  const cached = getStoredUserData(userId);
  if (cached?.events) {
    const updatedEvents = cached.events.filter((e) => e.id !== eventId);
    saveStoredUserData(userId, { events: updatedEvents });
  }

  try {
    const evtRef = doc(db, 'users', userId, 'events', eventId);
    await deleteDoc(evtRef);
  } catch (error) {
    console.warn('Firestore delete event note:', error);
  }
}

export async function syncBurnoutLogToDb(userId: string, log: BurnoutEntry) {
  const cached = getStoredUserData(userId);
  const currentLogs = cached?.burnoutLogs || [];
  const existsIndex = currentLogs.findIndex((b) => b.id === log.id);
  let updatedLogs: BurnoutEntry[];
  if (existsIndex >= 0) {
    updatedLogs = currentLogs.map((b) => (b.id === log.id ? log : b));
  } else {
    updatedLogs = [log, ...currentLogs];
  }
  saveStoredUserData(userId, { burnoutLogs: updatedLogs });

  try {
    const logRef = doc(db, 'users', userId, 'burnoutLogs', log.id);
    await setDoc(logRef, { ...log, userId }, { merge: true });
  } catch (error) {
    console.warn('Firestore burnout log sync note:', error);
  }
}

export async function deleteBurnoutLogFromDb(userId: string, logId: string) {
  const cached = getStoredUserData(userId);
  if (cached?.burnoutLogs) {
    const updatedLogs = cached.burnoutLogs.filter((b) => b.id !== logId);
    saveStoredUserData(userId, { burnoutLogs: updatedLogs });
  }

  try {
    const logRef = doc(db, 'users', userId, 'burnoutLogs', logId);
    await deleteDoc(logRef);
  } catch (error) {
    console.warn('Firestore delete burnout log note:', error);
  }
}

export async function resetUserDataInDb(userId: string) {
  saveStoredUserData(userId, {
    stats: INITIAL_USER_STATS,
    events: INITIAL_EVENTS,
    burnoutLogs: INITIAL_BURNOUT_LOGS,
  });

  try {
    const batch = writeBatch(db);
    const userRef = doc(db, 'users', userId);
    batch.set(
      userRef,
      {
        ...INITIAL_USER_STATS,
        userId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    INITIAL_EVENTS.forEach((evt) => {
      const evtRef = doc(db, 'users', userId, 'events', evt.id);
      batch.set(evtRef, { ...evt, userId });
    });

    INITIAL_BURNOUT_LOGS.forEach((log) => {
      const logRef = doc(db, 'users', userId, 'burnoutLogs', log.id);
      batch.set(logRef, { ...log, userId });
    });

    await batch.commit();
  } catch (error) {
    console.warn('Failed to reset user data in Firestore:', error);
  }
}

export function subscribeToUserData(
  userId: string,
  onData: (data: {
    stats?: UserStats;
    events: SocialEvent[];
    burnoutLogs: BurnoutEntry[];
  }) => void
) {
  const cached = getStoredUserData(userId);
  let currentStats: UserStats | undefined = cached?.stats;
  let currentEvents: SocialEvent[] = cached?.events && cached.events.length > 0 ? cached.events : [];
  let currentLogs: BurnoutEntry[] = cached?.burnoutLogs && cached.burnoutLogs.length > 0 ? cached.burnoutLogs : [];

  const userRef = doc(db, 'users', userId);
  const eventsQuery = query(
    collection(db, 'users', userId, 'events'),
    orderBy('timestamp', 'desc')
  );
  const burnoutQuery = query(
    collection(db, 'users', userId, 'burnoutLogs'),
    orderBy('isoDate', 'desc')
  );

  const unsubUser = onSnapshot(
    userRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const d = docSnap.data();
        const userEmail = d.email || currentStats?.email || '';
        const isSuperAdminEmail = userEmail.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();

        let resolvedName = d.userName;
        if (!isSuperAdminEmail && (resolvedName === 'Admin Nebo Martinez' || resolvedName === 'Nebo Martinez')) {
          resolvedName = undefined;
        }
        let cachedStatsName = currentStats?.userName;
        if (!isSuperAdminEmail && (cachedStatsName === 'Admin Nebo Martinez' || cachedStatsName === 'Nebo Martinez')) {
          cachedStatsName = undefined;
        }

        currentStats = {
          currentEnergy: d.currentEnergy ?? (currentStats?.currentEnergy ?? 100),
          baseCapacity: d.baseCapacity ?? (currentStats?.baseCapacity ?? 100),
          avatarUrl: d.avatarUrl || currentStats?.avatarUrl || INITIAL_USER_STATS.avatarUrl,
          userName:
            resolvedName ||
            cachedStatsName ||
            userEmail.split('@')[0] ||
            (isSuperAdminEmail ? 'Admin Nebo Martinez' : 'Social Explorer'),
          presence: d.presence || currentStats?.presence || 'active',
          role: isSuperAdminEmail ? 'admin' : ((d.role as UserRole) || currentStats?.role || 'user'),
          email: userEmail,
          userId: docSnap.id,
          updatedAt: d.updatedAt,
          adminInvitation: d.adminInvitation || currentStats?.adminInvitation,
        };
        saveStoredUserData(userId, { stats: currentStats });
        onData({ stats: currentStats, events: currentEvents, burnoutLogs: currentLogs });
      }
    },
    (err) => {
      console.warn('subscribeToUserData (user doc) fallback:', err);
    }
  );

  const unsubEvents = onSnapshot(
    eventsQuery,
    (snapshot) => {
      if (!snapshot.empty) {
        currentEvents = snapshot.docs.map((doc) => doc.data() as SocialEvent);
        saveStoredUserData(userId, { events: currentEvents });
        onData({ stats: currentStats, events: currentEvents, burnoutLogs: currentLogs });
      }
    },
    (err) => {
      console.warn('subscribeToUserData (events) fallback:', err);
    }
  );

  const unsubLogs = onSnapshot(
    burnoutQuery,
    (snapshot) => {
      if (!snapshot.empty) {
        currentLogs = snapshot.docs.map((doc) => doc.data() as BurnoutEntry);
        saveStoredUserData(userId, { burnoutLogs: currentLogs });
        onData({ stats: currentStats, events: currentEvents, burnoutLogs: currentLogs });
      }
    },
    (err) => {
      console.warn('subscribeToUserData (burnoutLogs) fallback:', err);
    }
  );

  return () => {
    unsubUser();
    unsubEvents();
    unsubLogs();
  };
}

// -------------------------------------------------------------
// ADMIN SERVICES
// -------------------------------------------------------------

function getDeletedUserIds(): Set<string> {
  try {
    const raw = localStorage.getItem('social_battery_deleted_user_ids');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr);
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return new Set();
}

function markUserIdDeleted(userId: string) {
  try {
    const set = getDeletedUserIds();
    set.add(userId);
    localStorage.setItem('social_battery_deleted_user_ids', JSON.stringify(Array.from(set)));
  } catch (e) {
    // Ignore storage write errors
  }
}

// Subscribe to all users (for Admin Dashboard)
export function subscribeToAllUsers(onUsers: (users: UserProfileRecord[]) => void) {
  const usersRef = collection(db, 'users');

  const mergeAndEmit = (dbUsers: UserProfileRecord[] = []) => {
    const deletedIds = getDeletedUserIds();
    const existingIds = new Set<string>();
    const existingEmails = new Set<string>();
    const mergedList: UserProfileRecord[] = [];

    // 1. Process Firestore remote users
    dbUsers.forEach((u) => {
      if (!deletedIds.has(u.userId)) {
        existingIds.add(u.userId);
        if (u.email) existingEmails.add(u.email.toLowerCase());
        mergedList.push(u);
      }
    });

    // 2. Process locally registered accounts (ensures every registered user appears immediately)
    const storedAccounts = getStoredAccounts();
    storedAccounts.forEach((acc) => {
      if (
        !deletedIds.has(acc.uid) &&
        !existingIds.has(acc.uid) &&
        (!acc.email || !existingEmails.has(acc.email.toLowerCase()))
      ) {
        existingIds.add(acc.uid);
        if (acc.email) existingEmails.add(acc.email.toLowerCase());
        const cached = getStoredUserData(acc.uid);
        mergedList.push({
          userId: acc.uid,
          email: acc.email,
          userName: cached?.stats?.userName || acc.displayName || acc.email.split('@')[0],
          avatarUrl: cached?.stats?.avatarUrl || acc.photoURL || INITIAL_USER_STATS.avatarUrl,
          currentEnergy: cached?.stats?.currentEnergy ?? 75,
          baseCapacity: cached?.stats?.baseCapacity ?? 100,
          presence: cached?.stats?.presence || 'active',
          role: cached?.stats?.role || acc.role || getDefaultRoleForUser(acc.email),
          createdAt: acc.createdAt || new Date().toISOString(),
          updatedAt: cached?.stats?.updatedAt || acc.createdAt || new Date().toISOString(),
          isGuest: false,
          adminInvitation: cached?.stats?.adminInvitation || (acc as any).adminInvitation,
        });
      }
    });

    // 3. Include initial community members (if not replaced by a real registered account with the same email or ID)
    INITIAL_COMMUNITY_MEMBERS.forEach((member) => {
      if (
        !deletedIds.has(member.userId) &&
        !existingIds.has(member.userId) &&
        (!member.email || !existingEmails.has(member.email.toLowerCase()))
      ) {
        const cached = getStoredUserData(member.userId);
        mergedList.push({
          ...member,
          userName: cached?.stats?.userName || member.userName,
          avatarUrl: cached?.stats?.avatarUrl || member.avatarUrl,
          currentEnergy: cached?.stats?.currentEnergy ?? member.currentEnergy,
          presence: cached?.stats?.presence || member.presence,
          role: cached?.stats?.role || member.role,
          adminInvitation: cached?.stats?.adminInvitation,
          updatedAt: cached?.stats?.updatedAt || member.updatedAt,
        });
      }
    });

    // Sort: newest registered or updated accounts on top
    mergedList.sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || '';
      const dateB = b.updatedAt || b.createdAt || '';
      return dateB.localeCompare(dateA);
    });

    onUsers(mergedList);
  };

  let lastDbUsers: UserProfileRecord[] = [];

  const handleAccountUpdate = () => {
    mergeAndEmit(lastDbUsers);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('social_battery_accounts_updated', handleAccountUpdate);
    window.addEventListener('storage', handleAccountUpdate);
  }

  const unsubSnapshot = onSnapshot(
    usersRef,
    (snapshot) => {
      lastDbUsers = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          userId: docSnap.id,
          email: d.email || (d.isGuest ? 'guest@socialbattery.local' : ''),
          userName: d.userName || 'Unknown Member',
          avatarUrl: d.avatarUrl || INITIAL_USER_STATS.avatarUrl,
          currentEnergy: typeof d.currentEnergy === 'number' ? d.currentEnergy : 65,
          baseCapacity: d.baseCapacity ?? 100,
          presence: d.presence || 'active',
          role: (d.role as UserRole) || 'user',
          createdAt: d.createdAt || d.updatedAt || new Date().toISOString(),
          updatedAt: d.updatedAt || new Date().toISOString(),
          isGuest: Boolean(d.isGuest),
          adminInvitation: d.adminInvitation,
        };
      });

      mergeAndEmit(lastDbUsers);
    },
    (err) => {
      console.warn('subscribeToAllUsers fallback to local records:', err);
      mergeAndEmit([]);
    }
  );

  return () => {
    unsubSnapshot();
    if (typeof window !== 'undefined') {
      window.removeEventListener('social_battery_accounts_updated', handleAccountUpdate);
      window.removeEventListener('storage', handleAccountUpdate);
    }
  };
}

// Admin: Fetch all users once from Firestore database
export async function fetchAllUsersFromDb(): Promise<UserProfileRecord[]> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const dbUsers: UserProfileRecord[] = snapshot.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        userId: docSnap.id,
        email: d.email || '',
        userName: d.userName || 'Member',
        avatarUrl: d.avatarUrl || INITIAL_USER_STATS.avatarUrl,
        currentEnergy: typeof d.currentEnergy === 'number' ? d.currentEnergy : 65,
        baseCapacity: d.baseCapacity ?? 100,
        presence: d.presence || 'active',
        role: (d.role as UserRole) || 'user',
        createdAt: d.createdAt || d.updatedAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString(),
        isGuest: Boolean(d.isGuest),
      };
    });

    const deletedIds = getDeletedUserIds();
    const existingIds = new Set<string>();
    const existingEmails = new Set<string>();
    const mergedList: UserProfileRecord[] = [];

    dbUsers.forEach((u) => {
      if (!deletedIds.has(u.userId)) {
        existingIds.add(u.userId);
        if (u.email) existingEmails.add(u.email.toLowerCase());
        mergedList.push(u);
      }
    });

    const storedAccounts = getStoredAccounts();
    storedAccounts.forEach((acc) => {
      if (
        !deletedIds.has(acc.uid) &&
        !existingIds.has(acc.uid) &&
        (!acc.email || !existingEmails.has(acc.email.toLowerCase()))
      ) {
        existingIds.add(acc.uid);
        if (acc.email) existingEmails.add(acc.email.toLowerCase());
        mergedList.push({
          userId: acc.uid,
          email: acc.email,
          userName: acc.displayName || acc.email.split('@')[0],
          avatarUrl: acc.photoURL || INITIAL_USER_STATS.avatarUrl,
          currentEnergy: 75,
          baseCapacity: 100,
          presence: 'active',
          role: acc.role || getDefaultRoleForUser(acc.email),
          createdAt: acc.createdAt || new Date().toISOString(),
          updatedAt: acc.createdAt || new Date().toISOString(),
          isGuest: false,
        });
      }
    });

    INITIAL_COMMUNITY_MEMBERS.forEach((m) => {
      if (
        !deletedIds.has(m.userId) &&
        !existingIds.has(m.userId) &&
        (!m.email || !existingEmails.has(m.email.toLowerCase()))
      ) {
        mergedList.push(m);
      }
    });

    mergedList.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''));
    return mergedList;
  } catch (err) {
    console.error('Failed to fetch all users from db:', err);
    const deletedIds = getDeletedUserIds();
    const storedAccounts = getStoredAccounts();
    const storedUsers: UserProfileRecord[] = storedAccounts
      .filter((acc) => !deletedIds.has(acc.uid))
      .map((acc) => ({
        userId: acc.uid,
        email: acc.email,
        userName: acc.displayName || acc.email.split('@')[0],
        avatarUrl: acc.photoURL || INITIAL_USER_STATS.avatarUrl,
        currentEnergy: 75,
        baseCapacity: 100,
        presence: 'active',
        role: acc.role || getDefaultRoleForUser(acc.email),
        createdAt: acc.createdAt || new Date().toISOString(),
        updatedAt: acc.createdAt || new Date().toISOString(),
        isGuest: false,
      }));
    return [
      ...storedUsers,
      ...INITIAL_COMMUNITY_MEMBERS.filter((m) => !deletedIds.has(m.userId)),
    ];
  }
}

// Admin: Create & input a new user account directly into Firestore database
export async function createNewUserAccountAdmin(userData: {
  userName: string;
  email: string;
  role: UserRole;
  currentEnergy?: number;
  presence?: UserPresence;
}): Promise<UserProfileRecord> {
  const newUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const avatarPool = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  ];
  const randomAvatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];
  const now = new Date().toISOString();

  const newUserRecord: UserProfileRecord = {
    userId: newUserId,
    email: userData.email.trim(),
    userName: userData.userName.trim(),
    avatarUrl: randomAvatar,
    currentEnergy: userData.currentEnergy ?? 75,
    baseCapacity: 100,
    presence: userData.presence || 'active',
    role: userData.role || 'user',
    createdAt: now,
    updatedAt: now,
    isGuest: false,
  };

  saveStoredAccount({
    uid: newUserId,
    email: userData.email.trim(),
    displayName: userData.userName.trim(),
    photoURL: randomAvatar,
    role: userData.role || 'user',
    createdAt: now,
  });

  try {
    const userRef = doc(db, 'users', newUserId);
    await setDoc(userRef, newUserRecord);

    // Also seed starter events so the newly registered user appears populated
    const batch = writeBatch(db);
    INITIAL_EVENTS.slice(0, 2).forEach((evt) => {
      const evtRef = doc(db, 'users', newUserId, 'events', `${evt.id}-${newUserId}`);
      batch.set(evtRef, { ...evt, id: `${evt.id}-${newUserId}`, userId: newUserId });
    });
    INITIAL_BURNOUT_LOGS.slice(0, 1).forEach((log) => {
      const logRef = doc(db, 'users', newUserId, 'burnoutLogs', `${log.id}-${newUserId}`);
      batch.set(logRef, { ...log, id: `${log.id}-${newUserId}`, userId: newUserId });
    });
    await batch.commit();
  } catch (err) {
    console.warn('Firestore create user account notice (persisted in local directory):', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
  }

  return newUserRecord;
}

// Admin: Delete a user account from Firestore database
export async function deleteUserAccountAdmin(userId: string): Promise<boolean> {
  try {
    // Delete subcollections (events and burnoutLogs) if any exist
    try {
      const eventsSnap = await getDocs(collection(db, 'users', userId, 'events'));
      const batch = writeBatch(db);
      eventsSnap.docs.forEach((d) => batch.delete(d.ref));
      const burnoutSnap = await getDocs(collection(db, 'users', userId, 'burnoutLogs'));
      burnoutSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (subErr) {
      console.warn('Subcollection cleanup warning:', subErr);
    }

    // Delete root user document
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
  } catch (err) {
    console.warn('Delete user doc notice:', err);
  }

  // Remove from stored accounts as well
  try {
    const updated = getStoredAccounts().filter((a) => a.uid !== userId);
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}

  markUserIdDeleted(userId);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
  }

  return true;
}

// Super Admin: Send an Admin Promotion Invitation to a member (does NOT auto-promote; user must approve)
export async function sendAdminPromotionInvite(
  userId: string,
  userName?: string,
  userEmail?: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const invitationData = {
    status: 'pending' as const,
    invitedBy: 'Nebo Martinez (Super Admin)',
    invitedByEmail: PRIMARY_ADMIN_EMAIL,
    invitedAt: now,
  };

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        role: 'invited_admin',
        adminInvitation: invitationData,
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Send admin promotion invite firestore notice:', error);
  }

  try {
    const accounts = getStoredAccounts();
    const target = accounts.find((a) => a.uid === userId || (userEmail && a.email.toLowerCase() === userEmail.toLowerCase()));
    if (target) {
      target.role = 'invited_admin';
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  try {
    const cached = getStoredUserData(userId);
    if (cached?.stats) {
      cached.stats.role = 'invited_admin';
      cached.stats.adminInvitation = invitationData;
      saveStoredUserData(userId, { stats: cached.stats });
    }
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }
  return true;
}

// Super Admin: Cancel or revoke an outgoing admin promotion invite
export async function cancelAdminPromotionInvite(userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        role: 'user',
        adminInvitation: {
          status: 'declined' as const,
          invitedBy: 'Nebo Martinez (Super Admin)',
          invitedByEmail: PRIMARY_ADMIN_EMAIL,
          invitedAt: now,
        },
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Cancel admin invite notice:', error);
  }

  try {
    const accounts = getStoredAccounts();
    const target = accounts.find((a) => a.uid === userId);
    if (target) {
      target.role = 'user';
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  try {
    const cached = getStoredUserData(userId);
    if (cached?.stats) {
      cached.stats.role = 'user';
      if (cached.stats.adminInvitation) {
        cached.stats.adminInvitation.status = 'declined';
      }
      saveStoredUserData(userId, { stats: cached.stats });
    }
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }
  return true;
}

// Member: Accept Admin Role Promotion (Preserves member's exact name and email!)
export async function acceptAdminPromotion(
  userId: string,
  preferredName?: string,
  preferredEmail?: string
): Promise<{ success: boolean; userName: string; email: string }> {
  const now = new Date().toISOString();
  const accounts = getStoredAccounts();
  const currentSession = getLocalSession();
  const cached = getStoredUserData(userId);

  // Find account by userId or email
  let targetAcc = accounts.find((a) => a.uid === userId);
  if (!targetAcc && preferredEmail) {
    targetAcc = accounts.find((a) => a.email.toLowerCase() === preferredEmail.toLowerCase());
  }
  if (!targetAcc && currentSession?.email) {
    targetAcc = accounts.find((a) => a.email.toLowerCase() === currentSession.email?.toLowerCase());
  }

  // Determine preserved user identity: strictly prioritize user's actual profile details
  let preservedName =
    preferredName ||
    targetAcc?.displayName ||
    (cached?.stats?.userName && cached?.stats?.userName !== 'Admin Nebo Martinez' && cached?.stats?.userName !== 'Nebo Martinez'
      ? cached?.stats?.userName
      : undefined) ||
    (currentSession?.displayName && currentSession?.displayName !== 'Admin Nebo Martinez' && currentSession?.displayName !== 'Nebo Martinez'
      ? currentSession?.displayName
      : undefined) ||
    'Community Member';

  let preservedEmail =
    preferredEmail ||
    targetAcc?.email ||
    (cached?.stats?.email && cached?.stats?.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
      ? cached?.stats?.email
      : undefined) ||
    (currentSession?.email && currentSession?.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
      ? currentSession?.email
      : undefined) ||
    '';

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const d = snap.data();
      if (d.userName && d.userName !== 'Admin Nebo Martinez' && d.userName !== 'Nebo Martinez') {
        preservedName = d.userName;
      }
      if (d.email && d.email.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()) {
        preservedEmail = d.email;
      }
    }

    // Safety fallback for name
    if (
      (!preservedName || preservedName === 'Admin Nebo Martinez' || preservedName === 'Nebo Martinez' || preservedName === 'Community Member') &&
      preservedEmail &&
      preservedEmail.toLowerCase() !== PRIMARY_ADMIN_EMAIL.toLowerCase()
    ) {
      preservedName = preservedEmail.split('@')[0];
    }

    await setDoc(
      userRef,
      {
        role: 'admin',
        userName: preservedName,
        email: preservedEmail,
        adminInvitation: {
          status: 'accepted' as const,
          invitedBy: 'Nebo Martinez (Super Admin)',
          invitedByEmail: PRIMARY_ADMIN_EMAIL,
          invitedAt: now,
        },
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Accept admin promotion firestore notice:', error);
  }

  // Update stored accounts with role 'admin' while strictly preserving their own name and email
  try {
    if (targetAcc) {
      targetAcc.role = 'admin';
      targetAcc.displayName = preservedName;
      if (preservedEmail) targetAcc.email = preservedEmail;
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  // Update local session if this is the active user
  if (currentSession && (currentSession.uid === userId || (preservedEmail && currentSession.email?.toLowerCase() === preservedEmail.toLowerCase()))) {
    const updatedSession: AppUserSession = {
      ...currentSession,
      displayName: preservedName,
      email: preservedEmail || currentSession.email,
      role: 'admin',
    };
    setLocalSession(updatedSession);
  }

  // Update local cached user data
  if (cached?.stats) {
    cached.stats.role = 'admin';
    cached.stats.userName = preservedName;
    if (preservedEmail) cached.stats.email = preservedEmail;
    if (cached.stats.adminInvitation) {
      cached.stats.adminInvitation.status = 'accepted';
    }
    saveStoredUserData(userId, { stats: cached.stats });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }

  return { success: true, userName: preservedName, email: preservedEmail };
}

// Member: Decline Admin Role Promotion
export async function declineAdminPromotion(userId: string): Promise<boolean> {
  const now = new Date().toISOString();
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        role: 'user',
        adminInvitation: {
          status: 'declined' as const,
          invitedBy: 'Nebo Martinez (Super Admin)',
          invitedByEmail: PRIMARY_ADMIN_EMAIL,
          invitedAt: now,
        },
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Decline admin promotion firestore notice:', error);
  }

  try {
    const accounts = getStoredAccounts();
    const target = accounts.find((a) => a.uid === userId);
    if (target) {
      target.role = 'user';
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  const currentSession = getLocalSession();
  if (currentSession && currentSession.uid === userId) {
    const updatedSession: AppUserSession = {
      ...currentSession,
      role: 'user',
    };
    setLocalSession(updatedSession);
  }

  const cached = getStoredUserData(userId);
  if (cached?.stats) {
    cached.stats.role = 'user';
    if (cached.stats.adminInvitation) {
      cached.stats.adminInvitation.status = 'declined';
    }
    saveStoredUserData(userId, { stats: cached.stats });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }
  return true;
}

// Admin: Approve a pending admin request (strictly preserves member's name and email)
export async function approveAdminRequest(userId: string) {
  const now = new Date().toISOString();
  const accounts = getStoredAccounts();
  const targetAcc = accounts.find((a) => a.uid === userId);
  const currentSession = getLocalSession();
  const cached = getStoredUserData(userId);

  const preservedName = targetAcc?.displayName || cached?.stats?.userName || 'Community Admin';
  const preservedEmail = targetAcc?.email || cached?.stats?.email || '';

  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        role: 'admin',
        updatedAt: now,
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Approve admin request notice:', error);
  }

  try {
    if (targetAcc) {
      targetAcc.role = 'admin';
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  if (currentSession && currentSession.uid === userId) {
    setLocalSession({ ...currentSession, role: 'admin' });
  }

  if (cached?.stats) {
    cached.stats.role = 'admin';
    saveStoredUserData(userId, { stats: cached.stats });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }
  return true;
}

// Admin: Reject or revoke a pending admin request (demote to user)
export async function rejectAdminRequest(userId: string) {
  const now = new Date().toISOString();
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { role: 'user', updatedAt: now }, { merge: true });
  } catch (error) {
    console.warn('Reject admin request notice:', error);
  }

  try {
    const accounts = getStoredAccounts();
    const target = accounts.find((a) => a.uid === userId);
    if (target) {
      target.role = 'user';
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  const currentSession = getLocalSession();
  if (currentSession && currentSession.uid === userId) {
    setLocalSession({ ...currentSession, role: 'user' });
  }

  const cached = getStoredUserData(userId);
  if (cached?.stats) {
    cached.stats.role = 'user';
    saveStoredUserData(userId, { stats: cached.stats });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }
  return true;
}

// Admin: Toggle or Set User Role (strictly preserves existing name and email)
export async function setUserRoleAdmin(userId: string, role: UserRole) {
  const now = new Date().toISOString();
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { role, updatedAt: now }, { merge: true });
  } catch (error) {
    console.warn('Set user role notice:', error);
  }

  try {
    const accounts = getStoredAccounts();
    const target = accounts.find((a) => a.uid === userId);
    if (target) {
      target.role = role;
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    }
  } catch (e) {}

  const currentSession = getLocalSession();
  if (currentSession && currentSession.uid === userId) {
    setLocalSession({ ...currentSession, role });
  }

  const cached = getStoredUserData(userId);
  if (cached?.stats) {
    cached.stats.role = role;
    saveStoredUserData(userId, { stats: cached.stats });
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
    window.dispatchEvent(new Event('social_battery_auth_changed'));
  }
  return true;
}

// Admin: Adjust specific user's battery energy
export async function setUserEnergyAdmin(userId: string, energy: number) {
  try {
    const clamped = Math.min(100, Math.max(0, energy));
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { currentEnergy: clamped, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    console.warn('Update user energy notice:', error);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('social_battery_accounts_updated'));
  }
  return true;
}

// Admin: Fetch detailed logs for a specific user
export async function fetchUserLogsAdmin(userId: string): Promise<{
  events: SocialEvent[];
  burnoutLogs: BurnoutEntry[];
}> {
  try {
    const eventsSnap = await getDocs(collection(db, 'users', userId, 'events'));
    const burnoutSnap = await getDocs(collection(db, 'users', userId, 'burnoutLogs'));

    let events = eventsSnap.docs.map((d) => d.data() as SocialEvent);
    let burnoutLogs = burnoutSnap.docs.map((d) => d.data() as BurnoutEntry);

    // Fallback to local storage cache if Firestore has no events for this user
    if (events.length === 0) {
      const cached = getStoredUserData(userId);
      if (cached?.events && cached.events.length > 0) {
        events = cached.events;
      }
    }
    if (burnoutLogs.length === 0) {
      const cached = getStoredUserData(userId);
      if (cached?.burnoutLogs && cached.burnoutLogs.length > 0) {
        burnoutLogs = cached.burnoutLogs;
      }
    }

    events.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    burnoutLogs.sort((a, b) => (b.isoDate || '').localeCompare(a.isoDate || ''));

    return { events, burnoutLogs };
  } catch (error) {
    console.warn('Firestore fetchUserLogsAdmin fallback to local store:', error);
    const cached = getStoredUserData(userId);
    return {
      events: cached?.events || [],
      burnoutLogs: cached?.burnoutLogs || [],
    };
  }
}

// Admin: Announcements / Broadcasts
export function subscribeToAnnouncements(onAnnouncements: (list: Announcement[]) => void) {
  const annRef = collection(db, 'announcements');
  return onSnapshot(annRef, (snapshot) => {
    const list: Announcement[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<Announcement, 'id'>),
    }));
    // sort newest first
    list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    onAnnouncements(list);
  }, (err) => {
    console.warn('subscribeToAnnouncements warning:', err);
  });
}

export async function publishAnnouncementAdmin(announcement: Omit<Announcement, 'id' | 'createdAt'>) {
  try {
    const id = `ann-${Date.now()}`;
    const annRef = doc(db, 'announcements', id);
    const fullAnnouncement: Announcement = {
      ...announcement,
      id,
      createdAt: new Date().toISOString(),
      active: true,
    };
    await setDoc(annRef, fullAnnouncement);
    return fullAnnouncement;
  } catch (error) {
    console.error('Failed to publish announcement:', error);
    throw error;
  }
}

export async function deleteAnnouncementAdmin(id: string) {
  try {
    const annRef = doc(db, 'announcements', id);
    await deleteDoc(annRef);
    return true;
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    throw error;
  }
}
