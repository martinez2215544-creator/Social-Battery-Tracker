import { useState, useEffect } from 'react';
import {
  ActiveTab,
  SocialEvent,
  BurnoutEntry,
  UserStats,
  UserPresence,
  Announcement,
  UserRole,
} from './types';
import {
  INITIAL_USER_STATS,
  INITIAL_EVENTS,
  INITIAL_BURNOUT_LOGS,
} from './data/initialData';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeView } from './components/HomeView';
import { EventLogsView } from './components/EventLogsView';
import { RechargeActivitiesView } from './components/RechargeActivitiesView';
import { BurnoutView } from './components/BurnoutView';
import { EventDetailView } from './components/EventDetailView';
import { AdminView } from './components/AdminView';
import { RechargeModal } from './components/RechargeModal';
import { ProfileModal } from './components/ProfileModal';
import { RegisterPromptModal } from './components/RegisterPromptModal';
import { AuthView } from './components/AuthView';
import { AdminInvitationNotification } from './components/AdminInvitationNotification';
import { parseNaturalLanguageEvent } from './lib/aiService';
import {
  auth,
  onAuthStateChanged,
  initUserDatabase,
  subscribeToUserData,
  subscribeToAnnouncements,
  syncUserStatsToDb,
  syncEventToDb,
  deleteEventFromDb,
  syncBurnoutLogToDb,
  deleteBurnoutLogFromDb,
  resetUserDataInDb,
  getLocalSession,
  getStoredUserData,
  saveStoredUserData,
  appSignOut,
  acceptAdminPromotion,
  declineAdminPromotion,
  type FirebaseUser,
  type AppUserSession,
} from './lib/firebase';

export default function App() {
  // Auth State (FirebaseUser or AppUserSession)
  const [currentUser, setCurrentUser] = useState<FirebaseUser | AppUserSession | null>(() => getLocalSession());
  const [authLoading, setAuthLoading] = useState(true);

  // App Data States - seeded with cached data for the current user if available for instantaneous, persistent loading
  const [userStats, setUserStats] = useState<UserStats>(() => {
    const session = getLocalSession();
    if (session?.uid) {
      const cached = getStoredUserData(session.uid);
      if (cached?.stats) return cached.stats;
    }
    return INITIAL_USER_STATS;
  });

  const [events, setEvents] = useState<SocialEvent[]>(() => {
    const session = getLocalSession();
    if (session?.uid) {
      const cached = getStoredUserData(session.uid);
      if (cached?.events && cached.events.length > 0) return cached.events;
    }
    return INITIAL_EVENTS;
  });

  const [burnoutLogs, setBurnoutLogs] = useState<BurnoutEntry[]>(() => {
    const session = getLocalSession();
    if (session?.uid) {
      const cached = getStoredUserData(session.uid);
      if (cached?.burnoutLogs && cached.burnoutLogs.length > 0) return cached.burnoutLogs;
    }
    return INITIAL_BURNOUT_LOGS;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isRegisterPromptOpen, setIsRegisterPromptOpen] = useState(false);
  const [registerPromptReason, setRegisterPromptReason] = useState<'event_limit' | 'quiet_room' | 'recharge' | 'burnout' | 'general'>('general');

  // Quick Access Mode determination
  const isQuickAccess = Boolean(
    (currentUser as any)?.isAnonymous ||
    (currentUser as any)?.isGuest ||
    userStats.isGuest ||
    (!currentUser?.email && currentUser?.uid?.startsWith('guest-'))
  );

  // Track logged events count in Quick Access mode
  const [quickAccessEventsLogged, setQuickAccessEventsLogged] = useState<number>(() => {
    try {
      const uid = currentUser?.uid || 'guest';
      const saved = localStorage.getItem(`qa_events_logged_${uid}`);
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (currentUser?.uid) {
      try {
        const saved = localStorage.getItem(`qa_events_logged_${currentUser.uid}`);
        setQuickAccessEventsLogged(saved ? parseInt(saved, 10) || 0 : 0);
      } catch {}
    }
  }, [currentUser?.uid]);

  const promptRegistration = (reason: 'event_limit' | 'quiet_room' | 'recharge' | 'burnout' | 'general' = 'general') => {
    setRegisterPromptReason(reason);
    setIsRegisterPromptOpen(true);
  };

  // Function to initialize user state
  const loadUserAppState = async (user: FirebaseUser | AppUserSession) => {
    try {
      const initialData = await initUserDatabase(user);
      setUserStats(initialData.stats);
      if (initialData.events && initialData.events.length > 0) {
        setEvents(initialData.events);
      }
      if (initialData.burnoutLogs && initialData.burnoutLogs.length > 0) {
        setBurnoutLogs(initialData.burnoutLogs);
      }
    } catch (err) {
      console.error('Error initializing user database:', err);
    }
  };

  // Listen to Firebase Auth state & custom local sessions
  useEffect(() => {
    const handleLocalSessionCheck = () => {
      const local = getLocalSession();
      if (local) {
        setCurrentUser(local);
        loadUserAppState(local);
        setAuthLoading(false);
      } else if (!auth.currentUser) {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    };

    window.addEventListener('social_battery_auth_changed', handleLocalSessionCheck);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await loadUserAppState(user);
      } else {
        const local = getLocalSession();
        if (local) {
          setCurrentUser(local);
          await loadUserAppState(local);
        } else {
          setCurrentUser(null);
        }
      }
      setAuthLoading(false);
    });

    return () => {
      unsubscribe();
      window.removeEventListener('social_battery_auth_changed', handleLocalSessionCheck);
    };
  }, []);

  // Real-time Firestore synchronization when user is signed in
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeUser = subscribeToUserData(currentUser.uid, (data) => {
      if (data.stats) {
        setUserStats(data.stats);
      }
      if (data.events !== undefined) {
        setEvents(data.events);
      }
      if (data.burnoutLogs !== undefined) {
        setBurnoutLogs(data.burnoutLogs);
      }
    });

    const unsubscribeAnnouncements = subscribeToAnnouncements((annList) => {
      setAnnouncements(annList);
    });

    return () => {
      unsubscribeUser();
      unsubscribeAnnouncements();
    };
  }, [currentUser]);

  // Initial energy baseline check for empty event history
  useEffect(() => {
    // If a brand new account has zero events logged and no recorded energy yet, baseline to 100%
    if (events.length === 0 && userStats.currentEnergy === undefined) {
      const updated: UserStats = {
        ...userStats,
        currentEnergy: 100,
      };
      setUserStats(updated);
      if (currentUser) {
        syncUserStatsToDb(currentUser.uid, updated);
      }
    }
  }, [events.length, userStats, currentUser]);

  // Selected event calculation
  const selectedEvent = events.find((e) => e.id === selectedEventId) || null;

  // One-shot AI Activity Prompt to directly control social battery percentage
  const handleAIControlBatteryFromPrompt = async (promptText: string): Promise<{
    success: boolean;
    event?: SocialEvent;
    delta?: number;
    oldEnergy?: number;
    newEnergy?: number;
    rationale?: string;
    error?: string;
  }> => {
    if (isQuickAccess) {
      if (quickAccessEventsLogged >= 1) {
        promptRegistration('event_limit');
        return { success: false, error: 'Quick access trial limit reached. Register for full access.' };
      }
    }

    try {
      const parsed = await parseNaturalLanguageEvent(promptText, userStats.currentEnergy);
      const oldEnergy = userStats.currentEnergy;
      const newEnergy = Math.min(100, Math.max(0, oldEnergy + parsed.energyImpact));

      const newId = `evt-${Date.now()}`;
      const newEvent: SocialEvent = {
        id: newId,
        name: parsed.name,
        type: parsed.type,
        categoryLabel: parsed.categoryLabel,
        timestamp: new Date().toISOString(),
        displayTime: 'Just now',
        durationHours: parsed.durationHours,
        durationLabel: parsed.durationLabel,
        energyImpact: parsed.energyImpact,
        impactLabel: parsed.impactLabel,
        mood: parsed.mood,
        notes: parsed.notes,
        iconName: parsed.iconName,
        isAiComputed: true,
        aiAnalysis: {
          energyImpact: parsed.energyImpact,
          impactLabel: parsed.impactLabel,
          categoryLabel: parsed.categoryLabel,
          aiRationale: parsed.aiRationale,
          breakdown: parsed.breakdown,
          rechargeRecommendation: parsed.rechargeRecommendation,
          recommendedRechargeAmount: parsed.recommendedRechargeAmount,
        },
      };

      const updatedStats: UserStats = {
        ...userStats,
        currentEnergy: newEnergy,
      };

      const nextEvents = [newEvent, ...events];
      setUserStats(updatedStats);
      setEvents(nextEvents);

      if (isQuickAccess) {
        setQuickAccessEventsLogged((prev) => {
          const next = prev + 1;
          try {
            if (currentUser?.uid) {
              localStorage.setItem(`qa_events_logged_${currentUser.uid}`, String(next));
            }
          } catch {}
          return next;
        });
      }

      if (currentUser?.uid) {
        saveStoredUserData(currentUser.uid, { events: nextEvents, stats: updatedStats });
        await syncEventToDb(currentUser.uid, newEvent);
        await syncUserStatsToDb(currentUser.uid, updatedStats);
      }

      return {
        success: true,
        event: newEvent,
        delta: parsed.energyImpact,
        oldEnergy,
        newEnergy,
        rationale: parsed.aiRationale,
      };
    } catch (err: any) {
      console.error('AI Control Battery Error:', err);
      return { success: false, error: err.message || 'Failed to control battery with AI' };
    }
  };

  // Add a new social/work/solo event
  const handleAddEvent = async (eventData: Omit<SocialEvent, 'id' | 'timestamp'>) => {
    // Quick Access Mode Restrictions:
    if (isQuickAccess) {
      // Rule 1: Non-social events cannot be saved unless registered
      if (eventData.type !== 'social') {
        promptRegistration('event_limit');
        return;
      }

      // Rule 2: Limit to exactly 1 social event in Quick Access
      if (quickAccessEventsLogged >= 1) {
        promptRegistration('event_limit');
        return;
      }
    }

    const newId = `evt-${Date.now()}`;
    const newEvent: SocialEvent = {
      ...eventData,
      id: newId,
      timestamp: new Date().toISOString(),
      displayTime: 'Just now',
    };

    // Calculate energy change
    const newEnergy = Math.min(
      100,
      Math.max(0, userStats.currentEnergy + eventData.energyImpact)
    );

    const updatedStats: UserStats = {
      ...userStats,
      currentEnergy: newEnergy,
    };

    const nextEvents = [newEvent, ...events];
    setUserStats(updatedStats);
    setEvents(nextEvents);
    setSelectedEventId(newId);
    setActiveTab('event-detail');

    if (isQuickAccess) {
      setQuickAccessEventsLogged((prev) => {
        const next = prev + 1;
        try {
          if (currentUser?.uid) {
            localStorage.setItem(`qa_events_logged_${currentUser.uid}`, String(next));
          }
        } catch {}
        return next;
      });
    }

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { events: nextEvents, stats: updatedStats });
      await syncEventToDb(currentUser.uid, newEvent);
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Update existing event
  const handleUpdateEvent = async (updatedEvent: SocialEvent) => {
    const oldEvent = events.find((e) => e.id === updatedEvent.id);
    let updatedStats = userStats;

    if (oldEvent) {
      const delta = updatedEvent.energyImpact - oldEvent.energyImpact;
      const newEnergy = Math.min(
        100,
        Math.max(0, userStats.currentEnergy + delta)
      );
      updatedStats = { ...userStats, currentEnergy: newEnergy };
      setUserStats(updatedStats);
    }

    const nextEvents = events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
    setEvents(nextEvents);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { events: nextEvents, stats: updatedStats });
      await syncEventToDb(currentUser.uid, updatedEvent);
      if (oldEvent) {
        await syncUserStatsToDb(currentUser.uid, updatedStats);
      }
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string) => {
    const target = events.find((e) => e.id === id);
    const remainingEvents = events.filter((e) => e.id !== id);
    let updatedStats = userStats;

    if (remainingEvents.length === 0) {
      // Default to 100% when no events remain
      updatedStats = { ...userStats, currentEnergy: 100 };
      setUserStats(updatedStats);
    } else if (target) {
      // Restore energy if event deleted
      const newEnergy = Math.min(
        100,
        Math.max(0, userStats.currentEnergy - target.energyImpact)
      );
      updatedStats = { ...userStats, currentEnergy: newEnergy };
      setUserStats(updatedStats);
    }

    setEvents(remainingEvents);
    if (selectedEventId === id) {
      setSelectedEventId(null);
      setActiveTab('home');
    }

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { events: remainingEvents, stats: updatedStats });
      await deleteEventFromDb(currentUser.uid, id);
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Add Burnout Log
  const handleAddBurnoutLog = async (entryData: Omit<BurnoutEntry, 'id'>) => {
    if (isQuickAccess) {
      promptRegistration('burnout');
      return;
    }
    const newEntry: BurnoutEntry = {
      ...entryData,
      id: `bo-${Date.now()}`,
    };
    const nextLogs = [newEntry, ...burnoutLogs];
    setBurnoutLogs(nextLogs);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { burnoutLogs: nextLogs });
      await syncBurnoutLogToDb(currentUser.uid, newEntry);
    }
  };

  // Delete Burnout Log
  const handleDeleteBurnoutLog = async (id: string) => {
    const nextLogs = burnoutLogs.filter((b) => b.id !== id);
    setBurnoutLogs(nextLogs);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { burnoutLogs: nextLogs });
      await deleteBurnoutLogFromDb(currentUser.uid, id);
    }
  };

  // Recharge session completion (+ energy boost)
  const handleCompleteRecharge = async (amount: number) => {
    handleApplyRechargeBoost(
      amount,
      'Guided Solo Recharge',
      15,
      'battery_charging_full',
      'Spent time in guided breathing to replenish social battery.'
    );
  };

  // Dedicated Recharge Boost Handler from Suggested Activities Interface
  const handleApplyRechargeBoost = async (
    amount: number,
    title: string,
    durationMinutes: number = 15,
    icon: string = 'bolt',
    description: string = 'Restorative activity to boost social battery'
  ) => {
    const newEnergy = Math.min(100, userStats.currentEnergy + amount);
    const updatedStats = { ...userStats, currentEnergy: newEnergy };
    setUserStats(updatedStats);

    // Record recharge event in history
    const rechargeEvent: SocialEvent = {
      id: `evt-recharge-${Date.now()}`,
      name: title,
      type: 'solo',
      categoryLabel: 'SOLO RECHARGE',
      timestamp: new Date().toISOString(),
      displayTime: 'Just now',
      durationHours: +(durationMinutes / 60).toFixed(2),
      durationLabel: `${durationMinutes}m recharge`,
      energyImpact: amount,
      impactLabel: 'Restorative boost',
      mood: 'Calm & Rested',
      notes: description,
      iconName: icon || 'bolt',
      isAiComputed: false,
    };

    const nextEvents = [rechargeEvent, ...events];
    setEvents(nextEvents);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { events: nextEvents, stats: updatedStats });
      await syncEventToDb(currentUser.uid, rechargeEvent);
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Update User Name
  const handleUpdateUserName = async (newName: string) => {
    const updatedStats = { ...userStats, userName: newName };
    setUserStats(updatedStats);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { stats: updatedStats });
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Update User Avatar / Icon
  const handleUpdateAvatar = async (newAvatar: string) => {
    const updatedStats = { ...userStats, avatarUrl: newAvatar };
    setUserStats(updatedStats);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { stats: updatedStats });
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Update User Presence / Status (Active, Away, DND)
  const handleUpdatePresence = async (presence: UserPresence) => {
    const updatedStats = { ...userStats, presence };
    setUserStats(updatedStats);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { stats: updatedStats });
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Update User Base Capacity
  const handleUpdateBaseCapacity = async (capacity: number) => {
    const updatedStats = { ...userStats, baseCapacity: capacity };
    setUserStats(updatedStats);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { stats: updatedStats });
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Toggle admin role (for testing & administration)
  const handleToggleAdminRole = async () => {
    const newRole: UserRole = userStats.role === 'admin' ? 'user' : 'admin';
    const updatedStats: UserStats = { ...userStats, role: newRole };
    setUserStats(updatedStats);

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, { stats: updatedStats });
      await syncUserStatsToDb(currentUser.uid, updatedStats);
    }
  };

  // Reset to initial sample data
  const handleResetData = async () => {
    setUserStats(INITIAL_USER_STATS);
    setEvents(INITIAL_EVENTS);
    setBurnoutLogs(INITIAL_BURNOUT_LOGS);
    setSelectedEventId(null);
    setActiveTab('home');

    if (currentUser?.uid) {
      saveStoredUserData(currentUser.uid, {
        stats: INITIAL_USER_STATS,
        events: INITIAL_EVENTS,
        burnoutLogs: INITIAL_BURNOUT_LOGS,
      });
      await resetUserDataInDb(currentUser.uid);
    }
  };

  // Sign out handler
  const handleSignOut = async () => {
    try {
      await appSignOut();
      setCurrentUser(null);
      setSelectedEventId(null);
      setActiveTab('home');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  // Determine effective user role
  const effectiveRole: UserRole =
    userStats.role ||
    (currentUser?.email?.toLowerCase() === 'martinez2215544@ceu.edu.ph' ? 'admin' : 'user');

  // Determine if user has a pending admin role invitation
  const hasAdminInvite = userStats.role === 'invited_admin' || userStats.adminInvitation?.status === 'pending';

  const handleAcceptAdminInvite = async () => {
    if (!currentUser) return;
    const res = await acceptAdminPromotion(
      currentUser.uid,
      userStats.userName,
      userStats.email || currentUser.email || undefined
    );
    if (res.success) {
      setUserStats((prev) => ({
        ...prev,
        role: 'admin',
        userName: res.userName,
        email: res.email || prev.email,
        adminInvitation: {
          status: 'accepted',
          invitedBy: prev.adminInvitation?.invitedBy || 'Nebo Martinez (Super Admin)',
          invitedByEmail: prev.adminInvitation?.invitedByEmail || 'martinez2215544@ceu.edu.ph',
          invitedAt: prev.adminInvitation?.invitedAt || new Date().toISOString(),
        },
      }));
    }
  };

  const handleDeclineAdminInvite = async () => {
    if (!currentUser) return;
    await declineAdminPromotion(currentUser.uid);
    setUserStats((prev) => ({
      ...prev,
      role: 'user',
      adminInvitation: {
        status: 'declined',
        invitedBy: prev.adminInvitation?.invitedBy || 'Nebo Martinez (Super Admin)',
        invitedByEmail: prev.adminInvitation?.invitedByEmail || 'martinez2215544@ceu.edu.ph',
        invitedAt: prev.adminInvitation?.invitedAt || new Date().toISOString(),
      },
    }));
  };

  // Loading Screen while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0e131e] text-[#dee2f2] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-full border-2 border-[#528dff] border-t-transparent animate-spin" />
        <p className="text-xs font-mono-tag text-[#afc6ff] tracking-wider uppercase">
          Connecting to Cloud Database...
        </p>
      </div>
    );
  }

  // If not signed in, show Auth / Login View
  if (!currentUser) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#0e131e] text-[#dee2f2] font-sans selection:bg-[#afc6ff] selection:text-[#002d6d] relative">
      {/* Top Header App Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedEventId={selectedEventId}
        setSelectedEventId={setSelectedEventId}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenRecharge={() => setIsRechargeOpen(true)}
        avatarUrl={userStats.avatarUrl}
        presence={userStats.presence || 'active'}
        role={effectiveRole}
        onUpdatePresence={handleUpdatePresence}
        isQuickAccess={isQuickAccess}
        onPromptRegister={() => promptRegistration('general')}
        hasAdminInvite={hasAdminInvite}
        onOpenAdminInvite={() => setIsProfileOpen(true)}
      />

      {/* Admin Role Promotion Notification Banner for Invited Users */}
      {hasAdminInvite && (
        <AdminInvitationNotification
          userStats={userStats}
          currentUserId={currentUser.uid}
          onAccept={handleAcceptAdminInvite}
          onDecline={handleDeclineAdminInvite}
        />
      )}

      {/* Main View Router */}
      {selectedEventId && selectedEvent ? (
        <EventDetailView
          event={selectedEvent}
          onBack={() => {
            setSelectedEventId(null);
            setActiveTab('home');
          }}
          onUpdateEvent={handleUpdateEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      ) : activeTab === 'events' || activeTab === 'log' ? (
        <EventLogsView
          events={events}
          onSelectEvent={(evt) => {
            setSelectedEventId(evt.id);
            setActiveTab('event-detail');
          }}
          onDeleteEvent={handleDeleteEvent}
          onNavigateToHome={() => {
            setSelectedEventId(null);
            setActiveTab('home');
          }}
          onNavigateToRecharge={() => {
            setSelectedEventId(null);
            setActiveTab('recharge');
          }}
          isQuickAccess={isQuickAccess}
          onPromptRegister={() => promptRegistration('general')}
        />
      ) : activeTab === 'recharge' ? (
        <RechargeActivitiesView
          currentBattery={userStats.currentEnergy}
          onApplyRechargeBoost={handleApplyRechargeBoost}
          onNavigateToHome={() => {
            setSelectedEventId(null);
            setActiveTab('home');
          }}
          onNavigateToLogs={() => {
            setSelectedEventId(null);
            setActiveTab('events');
          }}
          isQuickAccess={isQuickAccess}
          onPromptRegister={() => promptRegistration('recharge')}
        />
      ) : activeTab === 'burnout' ? (
        <BurnoutView
          burnoutLogs={burnoutLogs}
          onAddBurnoutLog={handleAddBurnoutLog}
          onDeleteBurnoutLog={handleDeleteBurnoutLog}
          isQuickAccess={isQuickAccess}
          onPromptRegister={() => promptRegistration('burnout')}
        />
      ) : activeTab === 'admin' ? (
        <AdminView
          currentUserStats={userStats}
          currentUserId={currentUser.uid}
          onNavigateHome={() => setActiveTab('home')}
        />
      ) : (
        <HomeView
          energyPercentage={userStats.currentEnergy}
          events={events}
          announcements={announcements}
          onNavigateToLogs={() => {
            setSelectedEventId(null);
            setActiveTab('events');
          }}
          onNavigateToRecharge={() => {
            setSelectedEventId(null);
            setActiveTab('recharge');
          }}
          onSelectEvent={(evt) => {
            setSelectedEventId(evt.id);
            setActiveTab('event-detail');
          }}
          onAIControlBatteryFromPrompt={handleAIControlBatteryFromPrompt}
          presence={userStats.presence || 'active'}
          onUpdatePresence={handleUpdatePresence}
          isQuickAccess={isQuickAccess}
          onPromptRegister={() => promptRegistration('general')}
        />
      )}

      {/* Sticky Bottom Navigation Bar (Mobile) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClearSelectedEvent={() => setSelectedEventId(null)}
        role={effectiveRole}
        isQuickAccess={isQuickAccess}
      />

      {/* Modals */}
      <RechargeModal
        isOpen={isRechargeOpen}
        onClose={() => setIsRechargeOpen(false)}
        onCompleteRecharge={handleCompleteRecharge}
        isQuickAccess={isQuickAccess}
        onPromptRegister={() => promptRegistration('recharge')}
      />

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        stats={{ ...userStats, role: effectiveRole }}
        events={events}
        userEmail={currentUser.email}
        isAnonymous={currentUser.isAnonymous}
        isQuickAccess={isQuickAccess}
        onSignOut={handleSignOut}
        onResetData={handleResetData}
        onUpdateUserName={handleUpdateUserName}
        onUpdateAvatar={handleUpdateAvatar}
        onUpdatePresence={handleUpdatePresence}
        onUpdateBaseCapacity={handleUpdateBaseCapacity}
        onOpenAdmin={() => setActiveTab('admin')}
        onPromptRegister={() => promptRegistration('general')}
        onAcceptAdminInvite={handleAcceptAdminInvite}
        onDeclineAdminInvite={handleDeclineAdminInvite}
      />

      {/* Quick Access Upgrade / Registration Prompt Modal */}
      <RegisterPromptModal
        isOpen={isRegisterPromptOpen}
        onClose={() => setIsRegisterPromptOpen(false)}
        reason={registerPromptReason}
        onSuccess={() => {
          setIsRegisterPromptOpen(false);
        }}
      />

      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-[#528dff]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#afc6ff]/5 rounded-full blur-[140px]" />
      </div>
    </div>
  );
}
