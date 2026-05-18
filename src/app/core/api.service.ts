import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  FeedPage,
  GifResult,
  GiveRequest,
  HashtagSuggestion,
  MeProfile,
  Redemption,
  Reward,
  UserBrief,
} from './types';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  me(): Observable<MeProfile> {
    return this.http.get<MeProfile>(`${this.base}/me`);
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
}
