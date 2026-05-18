import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MeProfile } from '../../core/types';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="topnav">
      <a routerLink="/feed" class="brand">buhosly</a>
      <div class="links">
        <a routerLink="/feed" routerLinkActive="active">Feed</a>
        <a routerLink="/give" routerLinkActive="active">Give</a>
        <a routerLink="/rewards" routerLinkActive="active">Rewards</a>
        <a routerLink="/redemptions" routerLinkActive="active">My redemptions</a>
        <a routerLink="/profile" routerLinkActive="active">Profile</a>
      </div>
      <div class="user">
        @if (me(); as m) {
          <span class="badge giving" title="Giving balance (resets monthly)">G {{ m.givingBalance }}</span>
          <span class="badge earned" title="Earned balance (redeemable)">E {{ m.earnedBalance }}</span>
          <span class="name">{{ m.name }}</span>
        } @else if (auth.currentUser(); as u) {
          <span class="name">{{ u.name }}</span>
        }
        <button type="button" (click)="auth.logout()">Logout</button>
      </div>
    </nav>
  `,
  styles: [
    `
      .topnav {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.75rem 1.25rem;
        background: #1f2937;
        color: #f9fafb;
      }
      .brand {
        font-weight: 700;
        font-size: 1.1rem;
        color: #fbbf24;
        text-decoration: none;
      }
      .links {
        display: flex;
        gap: 1rem;
        flex: 1;
      }
      .links a {
        color: #d1d5db;
        text-decoration: none;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
      }
      .links a.active {
        background: #374151;
        color: #fff;
      }
      .user {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .badge {
        font-size: 0.8rem;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-weight: 600;
      }
      .badge.giving {
        background: #fde68a;
        color: #78350f;
      }
      .badge.earned {
        background: #bbf7d0;
        color: #14532d;
      }
      .name {
        font-weight: 500;
      }
      button {
        background: #ef4444;
        color: white;
        border: none;
        padding: 0.35rem 0.85rem;
        border-radius: 4px;
        cursor: pointer;
      }
      button:hover {
        background: #dc2626;
      }
    `,
  ],
})
export class NavComponent {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  protected readonly me = signal<MeProfile | null>(null);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.api.me().subscribe({
        next: (m) => this.me.set(m),
        error: () => this.me.set(null),
      });
    }
  }

  refresh(): void {
    if (!this.auth.isAuthenticated()) {
      this.me.set(null);
      return;
    }
    this.api.me().subscribe({
      next: (m) => this.me.set(m),
      error: () => this.me.set(null),
    });
  }
}
