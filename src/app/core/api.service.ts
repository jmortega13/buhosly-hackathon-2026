import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AdminRedemptionRow,
  AdminRewardRow,
  AdminUserRow,
  BirthdayUser,
  FeedPage,
  GifResult,
  GiveRequest,
  HashtagReportRow,
  HashtagSuggestion,
  LeaderboardRow,
  MeProfile,
  Redemption,
  ReportWindow,
  Reward,
  RewardSuggestion,
  UserBrief,
} from './types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  me(): Observable<MeProfile> {
    return this.http.get<MeProfile>(`${this.base}/me`);
  }

  setBirthday(birthday: string | null): Observable<MeProfile> {
    return this.http.put<MeProfile>(`${this.base}/me/birthday`, { birthday });
  }

  birthdaysToday(): Observable<BirthdayUser[]> {
    return this.http.get<BirthdayUser[]>(`${this.base}/birthdays/today`);
  }

  listUsers(): Observable<UserBrief[]> {
    return this.http.get<UserBrief[]>(`${this.base}/users`);
  }

  feed(page: number, size?: number): Observable<FeedPage> {
    let params = new HttpParams().set('page', page);
    if (size != null) params = params.set('size', size);
    return this.http.get<FeedPage>(`${this.base}/feed`, { params });
  }

  give(req: GiveRequest): Observable<unknown> {
    return this.http.post(`${this.base}/recognitions`, req);
  }

  rewards(): Observable<Reward[]> {
    return this.http.get<Reward[]>(`${this.base}/rewards`);
  }

  redeem(rewardId: string): Observable<Redemption> {
    return this.http.post<Redemption>(`${this.base}/redemptions`, { rewardId });
  }

  myRedemptions(): Observable<Redemption[]> {
    return this.http.get<Redemption[]>(`${this.base}/redemptions/me`);
  }

  hashtags(q?: string): Observable<HashtagSuggestion[]> {
    let params = new HttpParams();
    if (q && q.length > 0) params = params.set('q', q);
    return this.http.get<HashtagSuggestion[]>(`${this.base}/hashtags`, { params });
  }

  gifs(q: string): Observable<GifResult[]> {
    const params = new HttpParams().set('q', q);
    return this.http.get<GifResult[]>(`${this.base}/gifs`, { params });
  }

  // ----- admin -----

  adminUsers(): Observable<AdminUserRow[]> {
    return this.http.get<AdminUserRow[]>(`${this.base}/admin/users`);
  }

  adminTopUp(userId: string, amount: number): Observable<AdminUserRow> {
    return this.http.post<AdminUserRow>(`${this.base}/admin/users/${userId}/top-up`, { amount });
  }

  adminSetMonthlyAllowance(userId: string, monthlyAllowance: number | null): Observable<AdminUserRow> {
    return this.http.put<AdminUserRow>(
      `${this.base}/admin/users/${userId}/monthly-allowance`,
      { monthlyAllowance }
    );
  }

  adminRewards(): Observable<AdminRewardRow[]> {
    return this.http.get<AdminRewardRow[]>(`${this.base}/admin/rewards`);
  }

  adminCreateReward(body: {
    name: string;
    description: string;
    costPoints: number;
    imageUrl: string;
  }): Observable<AdminRewardRow> {
    return this.http.post<AdminRewardRow>(`${this.base}/admin/rewards`, body);
  }

  adminUpdateReward(id: string, body: {
    name: string;
    description: string;
    costPoints: number;
    imageUrl: string;
    active: boolean;
  }): Observable<AdminRewardRow> {
    return this.http.put<AdminRewardRow>(`${this.base}/admin/rewards/${id}`, body);
  }

  adminDeleteReward(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/admin/rewards/${id}`);
  }

  adminRedemptions(): Observable<AdminRedemptionRow[]> {
    return this.http.get<AdminRedemptionRow[]>(`${this.base}/admin/redemptions`);
  }

  adminApproveRedemption(id: string): Observable<AdminRedemptionRow> {
    return this.http.post<AdminRedemptionRow>(`${this.base}/admin/redemptions/${id}/approve`, {});
  }

  adminRejectRedemption(id: string): Observable<AdminRedemptionRow> {
    return this.http.post<AdminRedemptionRow>(`${this.base}/admin/redemptions/${id}/reject`, {});
  }

  adminRedemptionsCsv(): Observable<Blob> {
    return this.http.get(`${this.base}/admin/redemptions.csv`, { responseType: 'blob' });
  }

  adminReportHashtags(window: ReportWindow): Observable<HashtagReportRow[]> {
    const params = new HttpParams().set('window', window);
    return this.http.get<HashtagReportRow[]>(`${this.base}/admin/reports/hashtags`, { params });
  }

  adminReportLeaderboard(window: ReportWindow): Observable<LeaderboardRow[]> {
    const params = new HttpParams().set('window', window);
    return this.http.get<LeaderboardRow[]>(`${this.base}/admin/reports/leaderboard`, { params });
  }

  // ----- reward suggestions (user-facing) -----

  suggestions(): Observable<RewardSuggestion[]> {
    return this.http.get<RewardSuggestion[]>(`${this.base}/suggestions`);
  }

  createSuggestion(body: {
    name: string;
    description: string;
    imageUrl: string;
  }): Observable<RewardSuggestion> {
    return this.http.post<RewardSuggestion>(`${this.base}/suggestions`, body);
  }

  voteSuggestion(id: string): Observable<RewardSuggestion> {
    return this.http.post<RewardSuggestion>(`${this.base}/suggestions/${id}/vote`, {});
  }

  deleteSuggestion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/suggestions/${id}`);
  }

  // ----- reward suggestions (admin) -----

  adminSuggestions(): Observable<RewardSuggestion[]> {
    return this.http.get<RewardSuggestion[]>(`${this.base}/admin/suggestions`);
  }

  adminPromoteSuggestion(id: string, body: { costPoints: number; imageUrl?: string }): Observable<unknown> {
    return this.http.post(`${this.base}/admin/suggestions/${id}/promote`, body);
  }

  adminDismissSuggestion(id: string): Observable<RewardSuggestion> {
    return this.http.post<RewardSuggestion>(`${this.base}/admin/suggestions/${id}/dismiss`, {});
  }
}
