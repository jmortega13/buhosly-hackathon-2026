import { Component, OnDestroy, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { AppNotification, MeProfile, NotificationType } from '../../core/types';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="topnav">
      <a routerLink="/feed" class="brand">buhosly</a>
      <div class="links">
        <a routerLink="/feed" routerLinkActive="active">Feed</a>
        <a routerLink="/rewards" routerLinkActive="active">Rewards</a>
        <a routerLink="/suggestions" routerLinkActive="active">Suggestions</a>
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

        @if (auth.isAuthenticated()) {
          <div class="bell-wrap">
            <button
              type="button"
              class="bell"
              (click)="toggleBell($event)"
              [attr.aria-label]="
                unreadCount() > 0
                  ? 'Notifications, ' + unreadCount() + ' unread'
                  : 'Notifications'
              "
            >
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 22a2.4 2.4 0 0 0 2.4-2.4H9.6A2.4 2.4 0 0 0 12 22Zm7-5.6V11a7 7 0 0 0-5.6-6.87V3.5a1.4 1.4 0 1 0-2.8 0v.63A7 7 0 0 0 5 11v5.4l-1.7 1.7a.9.9 0 0 0 .64 1.54h16.12a.9.9 0 0 0 .64-1.54L19 16.4Z"
                />
              </svg>
              @if (unreadCount() > 0) {
                <span class="badge-count">{{ unreadCount() > 99 ? '99+' : unreadCount() }}</span>
              }
            </button>

            @if (bellOpen()) {
              <div class="bell-pop" (click)="$event.stopPropagation()">
                <div class="bell-head">
                  <span>Notifications</span>
                  @if (unreadCount() > 0) {
                    <button type="button" class="link" (click)="markAllRead()">
                      Mark all read
                    </button>
                  }
                </div>
                @if (loading()) {
                  <div class="bell-empty">Loading…</div>
                } @else if (notifications().length === 0) {
                  <div class="bell-empty">You're all caught up 🎉</div>
                } @else {
                  <ul class="bell-list">
                    @for (n of notifications(); track n.id) {
                      <li
                        class="bell-item"
                        [class.unread]="!n.readAt"
                        (click)="onClickItem(n)"
                      >
                        <div class="bell-icon">{{ iconFor(n.type) }}</div>
                        <div class="bell-text">
                          <div class="bell-title">{{ n.title }}</div>
                          @if (n.body) {
                            <div class="bell-body">{{ n.body }}</div>
                          }
                          <div class="bell-time">{{ relativeTime(n.createdAt) }}</div>
                        </div>
                      </li>
                    }
                  </ul>
                }
              </div>
            }
          </div>
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
      .bell-wrap {
        position: relative;
      }
      .bell {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.35rem;
        width: 2.1rem;
        height: 2.1rem;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: white;
      }
      .bell:hover {
        background: rgba(255, 255, 255, 0.16);
        border-color: var(--rise-pink);
      }
      .bell .badge-count {
        position: absolute;
        top: -4px;
        right: -4px;
        background: var(--rise-pink);
        color: white;
        font-size: 0.65rem;
        font-weight: 700;
        padding: 0.05rem 0.35rem;
        border-radius: 999px;
        line-height: 1;
        min-width: 1rem;
        text-align: center;
        border: 1px solid #00002c;
      }
      .bell-pop {
        position: absolute;
        right: 0;
        top: calc(100% + 0.5rem);
        width: 22rem;
        max-height: 28rem;
        overflow-y: auto;
        background: white;
        color: #111827;
        border-radius: 0.75rem;
        box-shadow: 0 18px 40px rgba(0, 0, 44, 0.25);
        z-index: 60;
      }
      .bell-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid #e5e7eb;
        font-weight: 600;
        font-size: 0.92rem;
      }
      .bell-head .link {
        background: transparent;
        color: var(--rise-pink);
        border: none;
        font-size: 0.8rem;
        cursor: pointer;
        padding: 0;
      }
      .bell-head .link:hover {
        text-decoration: underline;
        background: transparent;
        border-color: transparent;
      }
      .bell-empty {
        padding: 1.25rem 1rem;
        text-align: center;
        color: #6b7280;
        font-size: 0.9rem;
      }
      .bell-list {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .bell-item {
        display: flex;
        gap: 0.7rem;
        padding: 0.7rem 1rem;
        border-bottom: 1px solid #f3f4f6;
        cursor: pointer;
        transition: background 0.1s ease;
      }
      .bell-item:hover {
        background: #f9fafb;
      }
      .bell-item.unread {
        background: #fff1f4;
      }
      .bell-item.unread:hover {
        background: #ffe2e7;
      }
      .bell-icon {
        font-size: 1.25rem;
        flex: 0 0 1.5rem;
        line-height: 1;
        padding-top: 0.1rem;
      }
      .bell-text {
        flex: 1;
        min-width: 0;
      }
      .bell-title {
        font-weight: 600;
        font-size: 0.9rem;
        color: #111827;
      }
      .bell-body {
        font-size: 0.83rem;
        color: #4b5563;
        margin-top: 0.15rem;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }
      .bell-time {
        font-size: 0.72rem;
        color: #9ca3af;
        margin-top: 0.2rem;
      }
    `,
  ],
})
export class NavComponent implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly me = signal<MeProfile | null>(null);
  protected readonly notifications = signal<AppNotification[]>([]);
  protected readonly unreadCount = signal<number>(0);
  protected readonly bellOpen = signal<boolean>(false);
  protected readonly loading = signal<boolean>(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private docClickHandler = (e: MouseEvent) => this.onDocumentClick(e);

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.loadMe();
      this.refreshUnread();
      this.startPolling();
      document.addEventListener('click', this.docClickHandler);
    }
  }

  ngOnDestroy(): void {
    this.stopPolling();
    document.removeEventListener('click', this.docClickHandler);
  }

  refresh(): void {
    if (!this.auth.isAuthenticated()) {
      this.me.set(null);
      this.notifications.set([]);
      this.unreadCount.set(0);
      this.stopPolling();
      return;
    }
    this.loadMe();
    this.refreshUnread();
    this.startPolling();
  }

  protected toggleBell(ev: MouseEvent): void {
    ev.stopPropagation();
    const next = !this.bellOpen();
    this.bellOpen.set(next);
    if (next) {
      this.loadNotifications();
    }
  }

  protected onClickItem(n: AppNotification): void {
    if (!n.readAt) {
      this.api.markNotificationRead(n.id).subscribe({
        next: (updated) => {
          this.notifications.update((list) =>
            list.map((item) => (item.id === n.id ? updated : item))
          );
          this.refreshUnread();
        },
        error: () => undefined,
      });
    }
    this.bellOpen.set(false);
    this.routeForType(n.type);
  }

  protected markAllRead(): void {
    this.api.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
        );
        this.unreadCount.set(0);
      },
      error: () => undefined,
    });
  }

  protected iconFor(type: NotificationType): string {
    switch (type) {
      case 'recognition_received':
        return '🎉';
      case 'giveable_refreshed':
        return '✨';
      case 'giveable_expiring':
        return '⏳';
    }
  }

  protected relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const diff = Date.now() - then;
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }

  private loadMe(): void {
    this.api.me().subscribe({
      next: (m) => this.me.set(m),
      error: () => this.me.set(null),
    });
  }

  private loadNotifications(): void {
    this.loading.set(true);
    this.api.notifications(10).subscribe({
      next: (list) => {
        this.notifications.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.notifications.set([]);
        this.loading.set(false);
      },
    });
  }

  private refreshUnread(): void {
    this.api.unreadNotificationCount().subscribe({
      next: (r) => this.unreadCount.set(r.count ?? 0),
      error: () => undefined,
    });
  }

  private startPolling(): void {
    this.stopPolling();
    this.pollTimer = setInterval(() => {
      if (this.auth.isAuthenticated()) {
        this.refreshUnread();
        if (this.bellOpen()) this.loadNotifications();
      }
    }, 30_000);
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private onDocumentClick(_e: MouseEvent): void {
    if (this.bellOpen()) this.bellOpen.set(false);
  }

  private routeForType(type: NotificationType): void {
    switch (type) {
      case 'recognition_received':
        this.router.navigateByUrl('/feed');
        break;
      case 'giveable_refreshed':
      case 'giveable_expiring':
        this.router.navigateByUrl('/feed');
        break;
    }
  }
}
