import { SocialEvent, BurnoutEntry, UserStats, UserProfileRecord } from '../types';

export const INITIAL_USER_STATS: UserStats = {
  currentEnergy: 100,
  baseCapacity: 100,
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5vQ8TTJrlgfnNnfct59vCYB9zX8AKGidN7rIsfII9QYo9WEoDC3fhiwmoA_UxOnmTyQheHI7CYqF9lD7RgfteqQE-kBT7aoU1qK_sKsawj_sEm_x0BfDUz55pSIXHxQ_rX1TeClkNqPGZKHkKUobnABO8Ar3_9NQVFBEIAZjFXxovPXG7abY2r0WZskx9VODHwLwT_ViUYEMH_xXcvWfGH7gVpEgLk6Ch5KN3DR_j4ELf986KmTBH',
  userName: 'Social Explorer',
  presence: 'active',
  lastEnergyResetTime: new Date().toISOString(),
};

export const INITIAL_EVENTS: SocialEvent[] = [
  {
    id: 'evt-1',
    name: 'Dinner with Friends',
    type: 'social',
    categoryLabel: 'SOCIAL GATHERING',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    displayTime: 'Today, 7:00 PM',
    durationHours: 2.5,
    durationLabel: 'Standard duration',
    energyImpact: -30,
    impactLabel: 'Moderate drain',
    mood: 'Content but Tired',
    notes: 'Great conversation, but a bit loud in the main seating area.',
    iconName: 'restaurant'
  },
  {
    id: 'evt-2',
    name: 'Morning Meditation',
    type: 'solo',
    categoryLabel: 'SOLO RECHARGE',
    timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
    displayTime: 'Today, 8:00 AM',
    durationHours: 0.5,
    durationLabel: 'Quick recharge',
    energyImpact: 15,
    impactLabel: 'Gentle restore',
    mood: 'Calm & Rested',
    notes: 'Spent 20 minutes with guided breathing and quiet reflection.',
    iconName: 'self_improvement'
  },
  {
    id: 'evt-3',
    name: 'Dinner with the Team',
    type: 'social',
    categoryLabel: 'SOCIAL GATHERING',
    timestamp: new Date(Date.now() - 3600000 * 30).toISOString(),
    displayTime: 'Yesterday, 7:00 PM',
    durationHours: 3.0,
    durationLabel: 'Longer than average',
    energyImpact: -45,
    impactLabel: 'Significant drain',
    mood: 'Content but Tired',
    notes: 'The restaurant was very loud, which drained me faster than expected. Next time, I should suggest a quieter venue.',
    iconName: 'restaurant'
  },
  {
    id: 'evt-4',
    name: 'Weekly Strategy Sync',
    type: 'work',
    categoryLabel: 'WORK MEETING',
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(),
    displayTime: '2 days ago, 2:00 PM',
    durationHours: 1.5,
    durationLabel: 'High focus required',
    energyImpact: -20,
    impactLabel: 'Noticeable drain',
    mood: 'Tired',
    notes: 'Multiple complex quarterly targets discussed back-to-back.',
    iconName: 'groups'
  }
];

export const INITIAL_BURNOUT_LOGS: BurnoutEntry[] = [
  {
    id: 'bo-1',
    date: 'Nov 12',
    isoDate: '2026-11-12',
    title: 'Over-scheduled weekend',
    reflection: 'Need at least 4 hours of solo time after family visits.'
  },
  {
    id: 'bo-2',
    date: 'Oct 28',
    isoDate: '2026-10-28',
    title: 'Back-to-back social events',
    reflection: 'Limit social gatherings to one per day, ideally with a buffer day in between.'
  },
  {
    id: 'bo-3',
    date: 'Sep 05',
    isoDate: '2026-09-05',
    title: 'Work deadline sprint',
    reflection: 'Remember to take actual lunch breaks away from the desk.'
  }
];

export const INITIAL_COMMUNITY_MEMBERS: UserProfileRecord[] = [
  {
    userId: 'usr-admin-nebo',
    email: 'martinez2215544@ceu.edu.ph',
    userName: 'Nebo Martinez (Administrator)',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5vQ8TTJrlgfnNnfct59vCYB9zX8AKGidN7rIsfII9QYo9WEoDC3fhiwmoA_UxOnmTyQheHI7CYqF9lD7RgfteqQE-kBT7aoU1qK_sKsawj_sEm_x0BfDUz55pSIXHxQ_rX1TeClkNqPGZKHkKUobnABO8Ar3_9NQVFBEIAZjFXxovPXG7abY2r0WZskx9VODHwLwT_ViUYEMH_xXcvWfGH7gVpEgLk6Ch5KN3DR_j4ELf986KmTBH',
    currentEnergy: 75,
    baseCapacity: 100,
    presence: 'active',
    role: 'admin',
    createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    isGuest: false,
  },
  {
    userId: 'usr-alex-chen',
    email: 'alex.chen@mindspace.io',
    userName: 'Alex Chen',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    currentEnergy: 42,
    baseCapacity: 100,
    presence: 'away',
    role: 'user',
    createdAt: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    isGuest: false,
  },
  {
    userId: 'usr-maya-lin',
    email: 'maya.lin@socialflow.org',
    userName: 'Maya Lin',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    currentEnergy: 88,
    baseCapacity: 100,
    presence: 'active',
    role: 'user',
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    isGuest: false,
  },
  {
    userId: 'usr-jordan-rivera',
    email: 'jordan.rivera@solorecharge.com',
    userName: 'Jordan Rivera',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    currentEnergy: 18,
    baseCapacity: 100,
    presence: 'dnd',
    role: 'user',
    createdAt: new Date(Date.now() - 3600000 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    isGuest: false,
  }
];
