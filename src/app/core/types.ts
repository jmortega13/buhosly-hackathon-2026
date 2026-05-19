export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

export interface MeProfile extends AuthUser {
  givingBalance: number;
  givingMonth: string;
  earnedBalance: number;
  monthlyAllowance: number | null;
  birthday: string | null;
  birthdayTopupAppliedToday?: boolean;
  birthdayTopUpAmount?: number;
}

export interface BirthdayUser {
  id: string;
  name: string;
  email: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  givingBalance: number;
  givingMonth: string;
  earnedBalance: number;
  monthlyAllowance: number | null;
  createdAt: string;
}

export interface AdminRewardRow {
  id: string;
  name: string;
  description: string;
  costPoints: number;
  imageUrl: string;
  active: boolean;
}

export interface AdminRedemptionRow {
  id: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  reward: { id: string; name: string };
  costPoints: number;
  status: string;
}

export interface UserBrief {
  id: string;
  name: string;
  email: string;
}

export interface FeedItem {
  giver: { id: string; name: string };
  // Optional because a stale (pre-grouping) backend may still send the legacy
  // singular `recipient` field. The template defends against both.
  recipients?: Array<{ id: string; name: string }>;
  amount: number;
  totalAmount?: number;
  message: string;
  hashtags: string[];
  createdAt: string;
  gifUrl: string | null;
}

export interface FeedPage {
  items: FeedItem[];
  page: number;
  size: number;
  hasMore: boolean;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  costPoints: number;
  imageUrl: string;
}

export interface Redemption {
  id: string;
  rewardId: string;
  rewardName: string;
  costPoints: number;
  createdAt: string;
  status: string;
}

export interface GiveRequest {
  recipientIds: string[];
  amount: number;
  message: string;
  hashtags: string[];
  gifUrl?: string;
}

export interface GifResult {
  id: string;
  previewUrl: string;
  gifUrl: string;
  alt: string;
}

export interface HashtagSuggestion {
  tag: string;
  usageCount: number;
  lastUsedAt: string;
}

export type ReportWindow = 'month' | 'all';

export interface HashtagReportRow {
  tag: string;
  recognitionCount: number;
  pointsTotal: number;
  lastUsedAt: string;
}

export interface LeaderboardRow {
  user: { id: string; name: string; email: string };
  pointsReceived: number;
  recognitionCount: number;
}

export interface RewardSuggestion {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  suggestedBy: { id: string; name: string };
  voteCount: number;
  hasVoted: boolean;
  status: 'open' | 'promoted' | 'dismissed';
  createdAt: string;
  promotedRewardId?: string;
}

export type NotificationType =
  | 'recognition_received'
  | 'giveable_refreshed'
  | 'giveable_expiring'
  | 'birthday_topup';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  readAt: string | null;
}
