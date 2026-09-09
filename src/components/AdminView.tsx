import React, { useState, useEffect } from 'react';
import { UserProfileRecord, UserStats, SocialEvent, BurnoutEntry, UserPresence, UserRole } from '../types';
import {
  subscribeToAllUsers,
  fetchAllUsersFromDb,
  createNewUserAccountAdmin,
  deleteUserAccountAdmin,
  setUserRoleAdmin,
  setUserEnergyAdmin,
  fetchUserLogsAdmin,
  approveAdminRequest,
  rejectAdminRequest,
  sendAdminPromotionInvite,
  cancelAdminPromotionInvite,
  resetUserEmail,
  resetUserPassword,
  sendResetEmailLink,
} from '../lib/firebase';

interface AdminViewProps {
  currentUserStats: UserStats;
  currentUserId?: string;
  onNavigateHome: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  currentUserStats,
  currentUserId,
  onNavigateHome,
}) => {
  const [users, setUsers] = useState<UserProfileRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'pending' | 'invited' | 'admin' | 'user' | 'guest'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Modal: Register / Input New Account into Database
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('user');
  const [newUserEnergy, setNewUserEnergy] = useState<number>(75);
  const [newUserPresence, setNewUserPresence] = useState<UserPresence>('active');
  const [isSubmittingNewUser, setIsSubmittingNewUser] = useState(false);

  // Inspected User Logs Modal
  const [inspectingUser, setInspectingUser] = useState<UserProfileRecord | null>(null);
  const [inspectedLogs, setInspectedLogs] = useState<{ events: SocialEvent[]; burnoutLogs: BurnoutEntry[] } | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);

  // Delete User Confirmation Modal
  const [userToDelete, setUserToDelete] = useState<UserProfileRecord | null>(null);

  // Reset User Email / Password Modal (Admin Managed)
  const [userToReset, setUserToReset] = useState<UserProfileRecord | null>(null);
  const [resetModalTab, setResetModalTab] = useState<'email' | 'password'>('email');
  const [adminNewEmail, setAdminNewEmail] = useState('');
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [resetModalLoading, setResetModalLoading] = useState(false);

  const PRIMARY_ADMIN_EMAIL = 'martinez2215544@ceu.edu.ph';

  // Real-time Database Subscription for all registered accounts
  useEffect(() => {
    const unsubUsers = subscribeToAllUsers((userList) => {
      setUsers(userList);
    });

    return () => {
      if (unsubUsers) unsubUsers();
    };
  }, []);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3800);
  };

  // Approve a pending admin request
  const handleApproveAdmin = async (userId: string, userName: string) => {
    setActionLoading(`approve-${userId}`);
    try {
      await approveAdminRequest(userId);
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, role: 'admin' as UserRole } : u))
      );
      showNotification(`Approved! ${userName} is now an Administrator.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to approve admin request', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Super Admin: Dispatch an admin promotion invitation to member
  const handleSendAdminInvite = async (userId: string, userName: string, userEmail?: string) => {
    setActionLoading(`invite-${userId}`);
    try {
      await sendAdminPromotionInvite(userId, userName, userEmail);
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, role: 'invited_admin' as UserRole } : u))
      );
      showNotification(`Admin promotion invite sent to "${userName}". Waiting for user approval.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to send admin invite', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Super Admin: Revoke / Cancel outgoing admin invitation
  const handleCancelAdminInvite = async (userId: string, userName: string) => {
    setActionLoading(`cancel-invite-${userId}`);
    try {
      await cancelAdminPromotionInvite(userId);
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, role: 'user' as UserRole } : u))
      );
      showNotification(`Admin invitation for "${userName}" was cancelled.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to cancel invitation', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Reject / Decline a pending admin request (or demote to regular member)
  const handleRejectAdmin = async (userId: string, userName: string) => {
    setActionLoading(`reject-${userId}`);
    try {
      await rejectAdminRequest(userId);
      setUsers((prev) =>
        prev.map((u) => (u.userId === userId ? { ...u, role: 'user' as UserRole } : u))
      );
      showNotification(`${userName} has been assigned the Regular Member role.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update user role', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Register / Input New User into Firestore DB
  const handleCreateNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      showNotification('Please provide both name and email.', 'error');
      return;
    }

    setIsSubmittingNewUser(true);
    try {
      const created = await createNewUserAccountAdmin({
        userName: newUserName.trim(),
        email: newUserEmail.trim(),
        role: newUserRole,
        currentEnergy: newUserEnergy,
        presence: newUserPresence,
      });

      setUsers((prev) => [created, ...prev.filter((u) => u.userId !== created.userId)]);
      showNotification(`Account for ${created.userName} registered in database!`);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole('user');
      setNewUserEnergy(75);
    } catch (err: any) {
      showNotification(err.message || 'Failed to register account in database', 'error');
    } finally {
      setIsSubmittingNewUser(false);
    }
  };

  // Delete User Account
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    if (userToDelete.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
      showNotification('The Primary Super Administrator account cannot be deleted.', 'error');
      setUserToDelete(null);
      return;
    }

    setActionLoading(`delete-${userToDelete.userId}`);
    try {
      await deleteUserAccountAdmin(userToDelete.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== userToDelete.userId));
      showNotification(`User account for "${userToDelete.userName}" was permanently deleted.`);
      setUserToDelete(null);
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete account', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Quick adjust user's energy battery level
  const handleAdjustEnergy = async (user: UserProfileRecord, delta: number) => {
    const newEnergy = Math.max(0, Math.min(100, user.currentEnergy + delta));
    setActionLoading(`energy-${user.userId}`);
    try {
      await setUserEnergyAdmin(user.userId, newEnergy);
      setUsers((prev) =>
        prev.map((u) => (u.userId === user.userId ? { ...u, currentEnergy: newEnergy } : u))
      );
    } catch (err: any) {
      showNotification(err.message || 'Failed to update battery level', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Open Log Inspection for a User
  const handleInspectUser = async (user: UserProfileRecord) => {
    setInspectingUser(user);
    setLogsLoading(true);
    try {
      const data = await fetchUserLogsAdmin(user.userId);
      setInspectedLogs(data);
    } catch (err) {
      setInspectedLogs({ events: [], burnoutLogs: [] });
    } finally {
      setLogsLoading(false);
    }
  };

  // Admin: Reset / Update Administrator Email
  const handleAdminUpdateUserEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset || !userToReset.email) {
      showNotification('User does not have an email address.', 'error');
      return;
    }
    const isTargetAdmin = userToReset.role === 'admin' || userToReset.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
    if (!isTargetAdmin) {
      showNotification('Standard member credentials cannot be modified from the admin console.', 'error');
      return;
    }
    if (!adminNewEmail.trim()) {
      showNotification('Please provide a new email address.', 'error');
      return;
    }

    setResetModalLoading(true);
    try {
      const res = await resetUserEmail(userToReset.email, adminNewEmail.trim());
      setUsers((prev) =>
        prev.map((u) => (u.userId === userToReset.userId ? { ...u, email: adminNewEmail.trim() } : u))
      );
      showNotification(res.message);
      setUserToReset(null);
      setAdminNewEmail('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to update email', 'error');
    } finally {
      setResetModalLoading(false);
    }
  };

  // Admin: Reset Administrator Password
  const handleAdminUpdateUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToReset || !userToReset.email) {
      showNotification('User does not have an email address.', 'error');
      return;
    }
    const isTargetAdmin = userToReset.role === 'admin' || userToReset.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
    if (!isTargetAdmin) {
      showNotification('Standard member credentials cannot be modified from the admin console.', 'error');
      return;
    }
    if (adminNewPassword.length < 6) {
      showNotification('Password must be at least 6 characters.', 'error');
      return;
    }

    setResetModalLoading(true);
    try {
      const res = await resetUserPassword(userToReset.email, adminNewPassword);
      showNotification(res.message);
      setUserToReset(null);
      setAdminNewPassword('');
    } catch (err: any) {
      showNotification(err.message || 'Failed to update password', 'error');
    } finally {
      setResetModalLoading(false);
    }
  };

  // Admin: Dispatch Reset Link
  const handleAdminSendResetEmailLink = async () => {
    if (!userToReset || !userToReset.email) {
      showNotification('No registered email found for this user.', 'error');
      return;
    }

    setResetModalLoading(true);
    try {
      const res = await sendResetEmailLink(userToReset.email);
      showNotification(res.message);
      setUserToReset(null);
    } catch (err: any) {
      showNotification(err.message || 'Failed to send reset link', 'error');
    } finally {
      setResetModalLoading(false);
    }
  };

  // Filtered Users computation
  const pendingUsers = users.filter((u) => u.role === 'pending_admin');
  const invitedUsers = users.filter((u) => u.role === 'invited_admin' || u.adminInvitation?.status === 'pending');
  const adminUsers = users.filter((u) => u.role === 'admin');
  const memberUsers = users.filter((u) => u.role === 'user' && !u.isGuest && u.adminInvitation?.status !== 'pending');
  const guestUsers = users.filter((u) => u.isGuest);

  const filteredUsers = users.filter((u) => {
    // Role filter
    if (selectedRoleFilter === 'pending' && u.role !== 'pending_admin') return false;
    if (selectedRoleFilter === 'invited' && !(u.role === 'invited_admin' || u.adminInvitation?.status === 'pending')) return false;
    if (selectedRoleFilter === 'admin' && u.role !== 'admin') return false;
    if (selectedRoleFilter === 'user' && (u.role !== 'user' || u.isGuest || u.adminInvitation?.status === 'pending')) return false;
    if (selectedRoleFilter === 'guest' && !u.isGuest) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.userName.toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchId = u.userId.toLowerCase().includes(q);
      return matchName || matchEmail || matchId;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#090d16] text-[#dee2f2] pb-24 pt-20 px-4 sm:px-6 lg:px-8 font-sans selection:bg-amber-500 selection:text-black">
      {/* Floating Notification Toast */}
      {notification && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border text-xs font-semibold backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/90 border-rose-500/50 text-rose-200'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {notification.type === 'success' ? 'check_circle' : 'error'}
          </span>
          <span>{notification.msg}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-[#131824] border border-[#2a3042] rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 shadow-lg shadow-amber-500/10">
                <span className="material-symbols-outlined text-3xl">manage_accounts</span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#dee2f2]">
                    Registered Accounts Console
                  </h1>
                  <span className="font-mono-tag text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <span>{currentUserStats.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase() ? '👑' : '🛡️'}</span>
                    <span>
                      {currentUserStats.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase()
                        ? 'Super Admin: Nebo Martinez'
                        : `Admin: ${currentUserStats.userName || 'Community Admin'}`}
                    </span>
                  </span>
                  <span className="font-mono-tag text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-emerald-400">shield</span>
                    <span>2FA Protected</span>
                  </span>
                </div>
                <p className="text-xs text-[#a0a5b8] mt-1 flex items-center gap-2">
                  <span>Connected Admin:</span>
                  <span className="font-mono text-amber-200">
                    {currentUserStats.email || (currentUserStats.userName ? `${currentUserStats.userName} (Admin)` : PRIMARY_ADMIN_EMAIL)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Cloud Firestore Live Sync</span>
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 text-black font-bold text-xs transition-all shadow-lg shadow-amber-500/20 hover:opacity-95 active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span>+ Register Account</span>
              </button>

              <button
                onClick={onNavigateHome}
                className="px-4 py-2 rounded-xl bg-[#252c3e] hover:bg-[#2e374d] text-[#dee2f2] border border-white/10 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                <span>Back to App</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/5">
            <div className="bg-[#0e121c] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag uppercase text-[#8c91a4] block">
                  Total Accounts
                </span>
                <span className="text-xl font-bold text-[#dee2f2]">{users.length}</span>
              </div>
              <span className="material-symbols-outlined text-[#528dff] text-2xl">groups</span>
            </div>

            <div
              onClick={() => setSelectedRoleFilter('pending')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                pendingUsers.length > 0
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25'
                  : 'bg-[#0e121c] border-white/5 text-[#8c91a4]'
              }`}
            >
              <div>
                <span className="text-[10px] font-mono-tag uppercase block">
                  Pending Approvals
                </span>
                <span className="text-xl font-bold text-amber-300">{pendingUsers.length}</span>
              </div>
              <span className="material-symbols-outlined text-amber-400 text-2xl">
                hourglass_top
              </span>
            </div>

            <div className="bg-[#0e121c] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag uppercase text-[#8c91a4] block">
                  Admins
                </span>
                <span className="text-xl font-bold text-amber-300">{adminUsers.length}</span>
              </div>
              <span className="material-symbols-outlined text-amber-400 text-2xl">
                admin_panel_settings
              </span>
            </div>

            <div className="bg-[#0e121c] p-3.5 rounded-2xl border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono-tag uppercase text-[#8c91a4] block">
                  Members & Guests
                </span>
                <span className="text-xl font-bold text-emerald-400">
                  {memberUsers.length + guestUsers.length}
                </span>
              </div>
              <span className="material-symbols-outlined text-emerald-400 text-2xl">
                person
              </span>
            </div>
          </div>
        </div>

        {/* PENDING ADMIN APPROVALS SECTION (Prominently displayed when there are pending requests) */}
        {pendingUsers.length > 0 && (
          <div className="bg-gradient-to-r from-amber-950/40 via-[#1a1710] to-[#14120e] border-2 border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <span className="material-symbols-outlined text-xl">hourglass_top</span>
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-amber-200 flex items-center gap-2">
                    <span>Pending Admin Approval Requests</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-xs font-bold">
                      {pendingUsers.length}
                    </span>
                  </h2>
                  <p className="text-xs text-amber-300/80">
                    The following users registered requesting Administrator privileges. They will not have admin access until approved by you.
                  </p>
                </div>
              </div>
            </div>

            {/* List of Pending Applicants */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
              {pendingUsers.map((pendingUser) => (
                <div
                  key={pendingUser.userId}
                  className="bg-[#10141f] border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={pendingUser.avatarUrl}
                        alt={pendingUser.userName}
                        className="w-12 h-12 rounded-xl object-cover border-2 border-amber-500/40"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-[#dee2f2]">
                            {pendingUser.userName}
                          </h3>
                          <span className="text-[10px] font-mono-tag bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                            Applicant
                          </span>
                        </div>
                        <p className="text-xs text-[#a0a5b8] font-mono mt-0.5 truncate max-w-[220px]">
                          {pendingUser.email || 'No email specified'}
                        </p>
                        <p className="text-[10px] font-mono-tag text-[#7a8094] mt-0.5">
                          Requested: {new Date(pendingUser.createdAt || pendingUser.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* One-click Approval Controls */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => handleApproveAdmin(pendingUser.userId, pendingUser.userName)}
                      disabled={actionLoading === `approve-${pendingUser.userId}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">verified</span>
                      <span>
                        {actionLoading === `approve-${pendingUser.userId}`
                          ? 'Approving...'
                          : 'Approve as Admin'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleRejectAdmin(pendingUser.userId, pendingUser.userName)}
                      disabled={actionLoading === `reject-${pendingUser.userId}`}
                      className="py-2 px-3 rounded-xl bg-[#202738] hover:bg-[#2c354c] text-[#c2c6d7] hover:text-white border border-white/10 font-semibold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base text-rose-400">close</span>
                      <span>Decline (Set Member)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REGISTERED ACCOUNTS DIRECTORY */}
        <div className="bg-[#131824] border border-[#2a3042] rounded-3xl p-5 sm:p-7 shadow-xl space-y-5">
          {/* Controls Header: Search & Filter Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div>
              <h2 className="text-lg font-bold text-[#dee2f2] flex items-center gap-2">
                <span>All Registered Accounts</span>
                <span className="text-xs font-mono-tag bg-[#1f2638] text-[#afc6ff] px-2 py-0.5 rounded-full border border-white/5 font-semibold">
                  {filteredUsers.length} / {users.length}
                </span>
              </h2>
              <p className="text-xs text-[#8c91a4] mt-0.5">
                Manage user permissions, battery energy states, inspect interaction history, and approve admin roles.
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c91a4] text-lg">
                search
              </span>
              <input
                type="text"
                placeholder="Search name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0e121c] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-[#dee2f2] focus:outline-none focus:border-amber-400 transition-all placeholder:text-[#5d6375]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8c91a4] hover:text-white cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'all', label: `All Accounts (${users.length})` },
              { key: 'pending', label: `Pending Approvals (${pendingUsers.length})`, highlight: pendingUsers.length > 0 },
              { key: 'invited', label: `Invited Admins (${invitedUsers.length})`, highlight: invitedUsers.length > 0 },
              { key: 'admin', label: `Admins (${adminUsers.length})` },
              { key: 'user', label: `Members (${memberUsers.length})` },
              { key: 'guest', label: `Guests (${guestUsers.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedRoleFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedRoleFilter === tab.key
                    ? tab.key === 'pending' || tab.key === 'invited'
                      ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                      : 'bg-[#528dff] text-[#00275f] font-bold shadow-md shadow-[#528dff]/20'
                    : tab.highlight
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25'
                    : 'bg-[#1b2232] text-[#a0a5b8] hover:text-[#dee2f2] border border-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Accounts List / Cards */}
          {filteredUsers.length === 0 ? (
            <div className="p-12 text-center bg-[#0e121c] rounded-2xl border border-white/5 space-y-3">
              <span className="material-symbols-outlined text-4xl text-[#5d6375]">person_search</span>
              <p className="text-sm font-semibold text-[#c2c6d7]">No registered accounts matched your criteria</p>
              <p className="text-xs text-[#8c91a4]">
                Try adjusting your search query or role filter, or click "+ Register Account" to create a new user record.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const isSuperAdmin = user.email?.toLowerCase() === PRIMARY_ADMIN_EMAIL.toLowerCase();
                const isCurrentSessionUser = user.userId === currentUserId;
                const isPendingAdmin = user.role === 'pending_admin';
                const isInvitedAdmin = user.role === 'invited_admin' || user.adminInvitation?.status === 'pending';
                const isAdmin = user.role === 'admin';

                return (
                  <div
                    key={user.userId}
                    className={`bg-[#0f1420] border rounded-2xl p-4 transition-all hover:border-white/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                      isPendingAdmin || isInvitedAdmin
                        ? 'border-amber-500/40 bg-amber-950/10'
                        : isSuperAdmin
                        ? 'border-amber-500/30'
                        : 'border-white/5'
                    }`}
                  >
                    {/* Left: User Identity & Details */}
                    <div className="flex items-center gap-3.5 min-w-[280px]">
                      <div className="relative">
                        <img
                          src={user.avatarUrl}
                          alt={user.userName}
                          className={`w-12 h-12 rounded-2xl object-cover border-2 ${
                            isSuperAdmin
                              ? 'border-amber-400'
                              : isAdmin
                              ? 'border-amber-400/60'
                              : isPendingAdmin || isInvitedAdmin
                              ? 'border-amber-500'
                              : 'border-white/10'
                          }`}
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0f1420] ${
                            user.presence === 'active'
                              ? 'bg-emerald-400'
                              : user.presence === 'away'
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                          title={`Status: ${user.presence || 'active'}`}
                        />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="font-bold text-sm text-[#dee2f2]">{user.userName}</h3>
                          {isCurrentSessionUser && (
                            <span className="text-[9px] font-mono-tag bg-[#528dff]/20 text-[#afc6ff] border border-[#528dff]/30 px-1.5 py-0.2 rounded font-bold">
                              YOU
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#8c91a4] font-mono truncate max-w-[240px]">
                          {user.email || (user.isGuest ? 'Guest Account' : 'No Email')}
                        </p>

                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10px] font-mono-tag text-[#5d6375]">
                            ID: {user.userId.slice(0, 10)}...
                          </span>
                          <span className="text-[10px] font-mono-tag text-[#5d6375]">
                            • Joined: {new Date(user.createdAt || user.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle 1: Role Badge & Quick Approval Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      {isSuperAdmin ? (
                        <span className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
                          <span>👑</span>
                          <span>Super Administrator</span>
                        </span>
                      ) : isPendingAdmin ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1">
                            <span>⏳</span>
                            <span>Pending Admin Approval</span>
                          </span>
                          <button
                            onClick={() => handleApproveAdmin(user.userId, user.userName)}
                            disabled={actionLoading === `approve-${user.userId}`}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 active:scale-95"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectAdmin(user.userId, user.userName)}
                            disabled={actionLoading === `reject-${user.userId}`}
                            className="px-2.5 py-1 rounded-xl bg-[#22293a] hover:bg-[#2e374d] text-[#c2c6d7] text-[11px] font-semibold transition-all border border-white/10 cursor-pointer disabled:opacity-50 active:scale-95"
                          >
                            Decline
                          </button>
                        </div>
                      ) : isInvitedAdmin ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1">
                            <span>✉️</span>
                            <span>Invite Sent (Pending Member Acceptance)</span>
                          </span>
                          <button
                            onClick={() => handleCancelAdminInvite(user.userId, user.userName)}
                            disabled={actionLoading === `cancel-invite-${user.userId}`}
                            className="px-2.5 py-1 rounded-xl bg-[#22293a] hover:bg-[#2e374d] text-rose-300 hover:text-rose-200 text-[11px] font-semibold transition-all border border-white/10 cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Cancel / Revoke Outgoing Invitation"
                          >
                            Revoke Invite
                          </button>
                        </div>
                      ) : isAdmin ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1">
                            <span>🛡️</span>
                            <span>Administrator</span>
                          </span>
                          <button
                            onClick={() => handleRejectAdmin(user.userId, user.userName)}
                            disabled={actionLoading === `reject-${user.userId}`}
                            className="text-[10px] font-mono-tag text-[#8c91a4] hover:text-amber-300 hover:underline cursor-pointer"
                            title="Demote to Regular Member"
                          >
                            Revoke Admin
                          </button>
                        </div>
                      ) : user.isGuest ? (
                        <span className="px-2.5 py-1 rounded-xl bg-[#1d2333] text-[#8c91a4] border border-white/5 text-xs font-mono-tag">
                          ⚡ Guest Explorer
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1">
                            <span>👤</span>
                            <span>Regular Member</span>
                          </span>
                          <button
                            onClick={() => handleSendAdminInvite(user.userId, user.userName, user.email)}
                            disabled={actionLoading === `invite-${user.userId}`}
                            className="text-[10px] font-mono-tag text-amber-400/90 hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1"
                            title="Send Admin Promotion Invite (Requires User Approval)"
                          >
                            <span>+ Invite as Admin</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Middle 2: Live Battery Telemetry & Controls */}
                    <div className="flex items-center gap-3 bg-[#0a0d14] px-3.5 py-2 rounded-xl border border-white/5 min-w-[200px]">
                      <span className="material-symbols-outlined text-sm text-[#528dff]">
                        battery_charging_full
                      </span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono-tag text-[#8c91a4]">Social Battery</span>
                          <span
                            className={`font-bold font-mono ${
                              user.currentEnergy > 60
                                ? 'text-emerald-400'
                                : user.currentEnergy > 30
                                ? 'text-amber-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {user.currentEnergy}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1b2030] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              user.currentEnergy > 60
                                ? 'bg-emerald-400'
                                : user.currentEnergy > 30
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, user.currentEnergy))}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Adjust Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleAdjustEnergy(user, -10)}
                          disabled={actionLoading === `energy-${user.userId}` || user.currentEnergy <= 0}
                          className="w-6 h-6 rounded-lg bg-[#161c2b] hover:bg-[#20273c] text-rose-300 text-xs font-bold flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                          title="Drain 10%"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handleAdjustEnergy(user, 10)}
                          disabled={actionLoading === `energy-${user.userId}` || user.currentEnergy >= 100}
                          className="w-6 h-6 rounded-lg bg-[#161c2b] hover:bg-[#20273c] text-emerald-300 text-xs font-bold flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                          title="Charge 10%"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 justify-end">
                      {user.email && (isSuperAdmin || isAdmin) && (
                        <button
                          onClick={() => {
                            setUserToReset(user);
                            setResetModalTab('email');
                            setAdminNewEmail('');
                            setAdminNewPassword('');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#1d2333] hover:bg-[#283046] text-[#afc6ff] hover:text-white border border-[#afc6ff]/20 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                          title="Reset or update administrator email / password"
                        >
                          <span className="material-symbols-outlined text-sm">mail_lock</span>
                          <span className="hidden sm:inline">Reset Admin Email</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleInspectUser(user)}
                        className="px-3 py-1.5 rounded-xl bg-[#1d2333] hover:bg-[#283046] text-[#c2c6d7] hover:text-[#dee2f2] border border-white/5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
                        title="View user events and reflections"
                      >
                        <span className="material-symbols-outlined text-sm">history_edu</span>
                        <span>Logs</span>
                      </button>

                      {!isSuperAdmin && (
                        <button
                          onClick={() => setUserToDelete(user)}
                          className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer flex items-center justify-center"
                          title="Delete user account"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Register / Input New Account into Database */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#131824] border border-[#2a3042] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <span className="material-symbols-outlined text-xl">person_add</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#dee2f2]">Register Account in Database</h2>
                  <p className="text-xs text-[#8c91a4]">Input a new registered user profile into Cloud Firestore</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="w-8 h-8 rounded-full bg-[#1e2536] text-[#8c91a4] hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-mono-tag uppercase text-[#8c91a4]">
                  Full Name / Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jordan Hayes"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#dee2f2] focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono-tag uppercase text-[#8c91a4]">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jordan.hayes@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-[#dee2f2] focus:outline-none focus:border-amber-400 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tag uppercase text-[#8c91a4]">
                    Initial Role
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#dee2f2] focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
                  >
                    <option value="user">Regular Member</option>
                    <option value="pending_admin">Pending Admin Approval</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tag uppercase text-[#8c91a4]">
                    Initial Presence
                  </label>
                  <select
                    value={newUserPresence}
                    onChange={(e) => setNewUserPresence(e.target.value as UserPresence)}
                    className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-[#dee2f2] focus:outline-none focus:border-amber-400 transition-all cursor-pointer"
                  >
                    <option value="active">Active (Available)</option>
                    <option value="away">Away (Low Battery)</option>
                    <option value="dnd">Do Not Disturb</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <label className="font-mono-tag uppercase text-[#8c91a4]">
                    Starting Social Battery Level
                  </label>
                  <span className="font-bold text-amber-300 font-mono">{newUserEnergy}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={newUserEnergy}
                  onChange={(e) => setNewUserEnergy(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#1b2232] hover:bg-[#252e44] text-[#c2c6d7] font-semibold text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewUser}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-300 text-black font-bold text-xs shadow-lg shadow-amber-500/20 hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingNewUser ? 'Registering...' : 'Save & Input to Cloud DB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Inspect User Logs */}
      {inspectingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#131824] border border-[#2a3042] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={inspectingUser.avatarUrl}
                  alt={inspectingUser.userName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-amber-400/40"
                />
                <div>
                  <h2 className="text-lg font-bold text-[#dee2f2]">{inspectingUser.userName}</h2>
                  <p className="text-xs text-[#8c91a4] font-mono">
                    {inspectingUser.email || 'Guest Explorer'} • {inspectingUser.role.toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingUser(null)}
                className="w-8 h-8 rounded-full bg-[#1e2536] text-[#8c91a4] hover:text-white flex items-center justify-center cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            {logsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                <p className="text-xs font-mono-tag text-[#8c91a4]">Retrieving telemetry logs from Firestore...</p>
              </div>
            ) : inspectedLogs ? (
              <div className="space-y-4">
                {/* Events list */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono-tag uppercase text-amber-300">
                    Interaction History ({inspectedLogs.events.length})
                  </h3>
                  {inspectedLogs.events.length === 0 ? (
                    <p className="text-xs text-[#5d6375] italic p-3 bg-[#0a0d14] rounded-xl">
                      No social events recorded yet for this account.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {inspectedLogs.events.map((evt) => (
                        <div
                          key={evt.id}
                          className="bg-[#0a0d14] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#dee2f2] block">{evt.name}</span>
                            <span className="text-[10px] font-mono-tag text-[#8c91a4]">
                              {evt.categoryLabel} • {evt.durationLabel}
                            </span>
                          </div>
                          <span
                            className={`font-mono font-bold ${
                              evt.energyImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {evt.energyImpact >= 0 ? `+${evt.energyImpact}%` : `${evt.energyImpact}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Burnout Logs */}
                <div className="space-y-2">
                  <h3 className="text-xs font-mono-tag uppercase text-amber-300">
                    Burnout Reflections ({inspectedLogs.burnoutLogs.length})
                  </h3>
                  {inspectedLogs.burnoutLogs.length === 0 ? (
                    <p className="text-xs text-[#5d6375] italic p-3 bg-[#0a0d14] rounded-xl">
                      No burnout journal entries recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {inspectedLogs.burnoutLogs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-[#0a0d14] p-3 rounded-xl border border-white/5 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#dee2f2]">{log.displayDate}</span>
                            <span className="text-[10px] font-mono-tag text-rose-400">
                              Severity: {log.severityScore}/10
                            </span>
                          </div>
                          <p className="text-xs text-[#a0a5b8] italic">"{log.notes}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingUser(null)}
                className="px-4 py-2 rounded-xl bg-[#1b2232] hover:bg-[#252e44] text-[#dee2f2] font-semibold text-xs transition-all cursor-pointer"
              >
                Close Logs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirm Delete User */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#131824] border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                <span className="material-symbols-outlined text-xl">delete_forever</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#dee2f2]">Delete User Account</h2>
                <p className="text-xs text-[#8c91a4]">This action is irreversible</p>
              </div>
            </div>

            {/* Target Account Summary Card */}
            <div className="bg-[#0b0e17] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <img
                src={userToDelete.avatarUrl}
                alt={userToDelete.userName}
                className="w-11 h-11 rounded-xl object-cover border border-white/10"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#dee2f2] truncate">{userToDelete.userName}</span>
                  <span className="text-[10px] font-mono-tag px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#a0a5b8] capitalize">
                    {userToDelete.role.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs font-mono text-[#a0a5b8] truncate">{userToDelete.email || 'No email associated'}</p>
                <p className="text-[10px] font-mono-tag text-[#5d6375] truncate">ID: {userToDelete.userId}</p>
              </div>
            </div>

            <p className="text-xs text-[#c2c6d7] leading-relaxed">
              Are you sure you want to permanently delete the account for{' '}
              <strong className="text-white">{userToDelete.userName}</strong>?
              All associated telemetry logs, events, and burnout records in Firestore will be erased.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={actionLoading === `delete-${userToDelete.userId}`}
                className="flex-1 py-2.5 rounded-xl bg-[#1b2232] hover:bg-[#252e44] text-[#c2c6d7] font-semibold text-xs transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading === `delete-${userToDelete.userId}`}
                onClick={handleConfirmDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-lg shadow-rose-600/20 active:scale-95 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === `delete-${userToDelete.userId}` ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Yes, Delete Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Reset User Email & Credentials (Admin Managed) */}
      {userToReset && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#131824] border border-[#528dff]/30 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#528dff]/20 border border-[#528dff]/40 flex items-center justify-center text-[#afc6ff]">
                  <span className="material-symbols-outlined text-xl">mark_email_read</span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#dee2f2]">Reset Administrator Credentials</h2>
                  <p className="text-xs text-[#8c91a4]">{userToReset.userName} (Admin)</p>
                </div>
              </div>
              <button
                onClick={() => setUserToReset(null)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-[#8c91a4] hover:text-[#dee2f2] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* User Details Box */}
            <div className="bg-[#0b0e17] border border-white/5 rounded-2xl p-3.5 flex items-center gap-3">
              <img
                src={userToReset.avatarUrl}
                alt={userToReset.userName}
                className="w-10 h-10 rounded-xl object-cover border border-white/10"
              />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-[#dee2f2] truncate">{userToReset.userName}</p>
                <p className="text-xs font-mono text-[#a0a5b8] truncate">Current: {userToReset.email || 'None'}</p>
              </div>
            </div>

            {/* Tab selection */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#090c13] rounded-xl border border-white/5 text-center">
              <button
                type="button"
                onClick={() => setResetModalTab('email')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  resetModalTab === 'email'
                    ? 'bg-[#528dff] text-[#00275f] shadow-sm'
                    : 'text-[#c2c6d7] hover:text-[#dee2f2]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                <span>Reset Email</span>
              </button>
              <button
                type="button"
                onClick={() => setResetModalTab('password')}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  resetModalTab === 'password'
                    ? 'bg-[#528dff] text-[#00275f] shadow-sm'
                    : 'text-[#c2c6d7] hover:text-[#dee2f2]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">key</span>
                <span>Reset Password</span>
              </button>
            </div>

            {resetModalTab === 'email' ? (
              <form onSubmit={handleAdminUpdateUserEmail} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tag uppercase text-[#8c91a4]">New Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. newemail@domain.edu.ph"
                    value={adminNewEmail}
                    onChange={(e) => setAdminNewEmail(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-[#2b3347] focus:border-[#528dff] rounded-xl px-3.5 py-2.5 text-sm text-[#dee2f2] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resetModalLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#528dff] hover:bg-[#6ba0ff] text-[#00275f] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {resetModalLoading ? (
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">save</span>
                        <span>Update Email</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={resetModalLoading}
                    onClick={handleAdminSendResetEmailLink}
                    className="py-2.5 px-3 rounded-xl bg-[#1b2232] hover:bg-[#252e44] text-[#afc6ff] font-semibold text-xs border border-[#afc6ff]/20 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Send Reset Link to current email"
                  >
                    <span className="material-symbols-outlined text-sm">send</span>
                    <span>Send Link</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminUpdateUserPassword} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tag uppercase text-[#8c91a4]">New Password (min 6 chars)</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    className="w-full bg-[#0a0d14] border border-[#2b3347] focus:border-[#528dff] rounded-xl px-3.5 py-2.5 text-sm text-[#dee2f2] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={resetModalLoading}
                    className="flex-1 py-2.5 rounded-xl bg-[#528dff] hover:bg-[#6ba0ff] text-[#00275f] font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {resetModalLoading ? (
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">lock_reset</span>
                        <span>Update Password</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
