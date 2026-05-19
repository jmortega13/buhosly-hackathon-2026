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
        <a routerLink="/rewards" routerLinkActive="active">Rewards</a>
        <a routerLink="/redemptions" routerLinkActive="active">My redemptions</a>
        <a routerLink="/profile" routerLinkActive="active">Profile</a>
        @if (auth.currentUser()?.isAdmin) {
          <a routerLink="/admin" routerLinkActive="active" class="admin">Admin</a>
        }
      </div>
      <div class="user">
        @if (me(); as m) {
          <span class="badge giving" title="Resets at the start of every month">
            Giveable Points: <strong>{{ m.givingBalance }}</strong>
          </span>
          <span class="badge earned" title="Available to redeem for rewards">
            Earned Points: <strong>{{ m.earnedBalance }}</strong>
          </span>
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
        padding: 0.85rem 1.5rem;
        background: var(--rise-header-bg);
        color: #f1f5fb;
        box-shadow: 0 2px 10px rgba(0, 0, 44, 0.18);
      }
      .brand {
        font-weight: 700;
        font-size: 1.25rem;
        color: var(--rise-pink);
        text-decoration: none;
        letter-spacing: 0.04em;
      }
      .links {
        display: flex;
        gap: 0.3rem;
        flex: 1;
      }
      .links a {
        color: rgba(255, 255, 255, 0.72);
        text-decoration: none;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        font-size: 0.92rem;
        transition: background 0.12s ease, color 0.12s ease;
      }
      .links a:hover {
        background: rgba(255, 255, 255, 0.08);
        color: white;
      }
      .links a.active {
        background: var(--rise-pink);
        color: white;
      }
      .links a.admin {
        border: 1px solid rgba(255, 255, 255, 0.35);
      }
      .links a.admin.active {
        border-color: var(--rise-pink);
      }
      .user {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }
      .badge {
        font-size: 0.8rem;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        font-weight: 600;
      }
      .badge.giving {
        background: rgba(255, 77, 109, 0.22);
        color: #ffd0d8;
      }
      .badge.earned {
        background: rgba(134, 239, 172, 0.2);
        color: #bbf7d0;
      }
      .name {
        font-weight: 500;
        color: white;
      }
      button {
        background: transparent;
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.35);
        padding: 0.35rem 1rem;
        border-radius: 999px;
        cursor: pointer;
        font-size: 0.85rem;
      }
      button:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: var(--rise-pink);
        color: white;
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
