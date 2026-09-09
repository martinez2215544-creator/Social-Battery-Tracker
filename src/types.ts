export type ActivityType = 'social' | 'work' | 'solo' | 'rest';

export type MoodType = 'Energized' | 'Content' | 'Content but Tired' | 'Tired' | 'Exhausted' | 'Calm & Rested';

export type ActiveTab = 'home' | 'events' | 'recharge' | 'burnout' | 'admin' | 'event-detail' | 'log';

export type UserRole = 'admin' | 'user' | 'pending_admin' | 'invited_admin';

export interface AdminInvitationInfo {
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  invitedByEmail: string;
  invitedAt: string;
}

export interface RechargeActivity {
  id: string;
  title: string;
  category: 'micro' | 'mindful' | 'deep' | 'sleep';
  boostPercentage: number;
  durationMinutes: number;
  durationLabel: string;
  icon: string;
  description: string;
  scienceTip: string;
}

export interface AIPercentageFactor {
  factor: string;
  impact: number; // e.g. -15 or +10
  rationale: string;
}

export interface AIEventAnalysis {
  energyImpact: number;
  impactLabel: string;
  categoryLabel?: string;
  aiRationale: string;
  breakdown: AIPercentageFactor[];
  rechargeRecommendation?: string;
  recommendedRechargeAmount?: number;
  burnoutRiskAlert?: string;
}

export interface AIBatteryDiagnostic {
  burnoutRiskIndex: number; // 0-100%
  drainVelocityPerHour: number; // %/hr
  predictedHoursRemaining: number; // hours
  batteryHealthStatus: string;
  aiDiagnostic: string;
  recommendedActions: {
    label: string;
    recoveryBoost: number;
    icon: string;
  }[];
}

export interface SocialEvent {
  id: string;
  name: string;
  type: ActivityType;
  categoryLabel?: string;
  timestamp: string; // ISO string
  displayTime: string; // e.g. "Today, 7:00 PM"
  durationHours: number;
  durationLabel?: string; // e.g. "Longer than average"
  energyImpact: number; // e.g. -45 for -45%, +15 for +15%
  impactLabel?: string; // e.g. "Significant drain"
  mood: MoodType;
  notes?: string;
  iconName?: string; // Lucide icon name or Material symbol
  userId?: string;
  aiAnalysis?: AIEventAnalysis;
  isAiComputed?: boolean;
}

export interface BurnoutEntry {
  id: string;
  date: string; // e.g., "Nov 12" or "Oct 28"
  isoDate: string;
  title: string;
  reflection: string;
  icon?: string;
  userId?: string;
}

export type UserPresence = 'active' | 'away' | 'dnd';

export interface UserStats {
  currentEnergy: number; // 0 - 100%
  baseCapacity: number;
  avatarUrl: string;
  userName: string;
  presence?: UserPresence;
  role?: UserRole;
  email?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  lastEnergyResetTime?: string;
  isGuest?: boolean;
  adminInvitation?: AdminInvitationInfo;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'advisory' | 'event' | 'maintenance' | 'tip';
  createdAt: string;
  authorName: string;
  active: boolean;
}

export interface UserProfileRecord {
  userId: string;
  email?: string;
  userName: string;
  avatarUrl: string;
  currentEnergy: number;
  baseCapacity: number;
  presence?: UserPresence;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
  lastEnergyResetTime?: string;
  isGuest?: boolean;
  adminInvitation?: AdminInvitationInfo;
}
