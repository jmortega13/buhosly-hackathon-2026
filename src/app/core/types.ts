export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface MeProfile extends AuthUser {
  givingBalance: number;
  givingMonth: string;
  earnedBalance: number;
}

export interface UserBrief {
  id: string;
  name: string;
  email?: string;
}

export interface FeedItem {
  giver: { id: string; name: string };
  recipient: { id: string; name: string };
  amount: number;
  message: string;
  hashtags: string[];
  createdAt: string;
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
}
