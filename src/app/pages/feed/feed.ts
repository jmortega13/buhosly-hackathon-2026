import { Component, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { FeedItem } from '../../core/types';

@Component({
  selector: 'app-feed',
  template: `
    <section class="feed">
      <h2>Recognition feed</h2>
      @if (loading() && items().length === 0) {
        <p class="muted">Loading…</p>
      } @else if (items().length === 0) {
        <p class="muted">No recognitions yet. Be the first to give one!</p>
      }
      <ul class="list">
        @for (item of items(); track item.createdAt + '-' + item.giver.id + '-' + item.recipient.id) {
          <li class="card">
            <div class="header">
              <strong>{{ item.giver.name }}</strong>
              <span class="arrow">→</span>
              <strong>{{ item.recipient.name }}</strong>
              <span class="amount">+{{ item.amount }}</span>
            </div>
            <p class="message">{{ item.message }}</p>
            <div class="tags">
              @for (h of item.hashtags; track h) {
                <span class="chip">#{{ h }}</span>
              }
            </div>
            <div class="time">{{ relative(item.createdAt) }}</div>
          </li>
        }
      </ul>
      @if (hasMore()) {
        <button type="button" (click)="loadMore()" [disabled]="loading()">
          {{ loading() ? 'Loading…' : 'Load more' }}
        </button>
      }
      @if (error()) {
        <p class="error">{{ error() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .feed {
        max-width: 720px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      h2 {
        margin: 0 0 1.25rem;
      }
      .muted {
        color: #6b7280;
      }
      .list {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 1rem 1.1rem;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 1rem;
      }
      .arrow {
        color: #9ca3af;
      }
      .amount {
        margin-left: auto;
        background: #fef3c7;
        color: #92400e;
        font-weight: 700;
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
      }
      .message {
        margin: 0.55rem 0 0.4rem;
        color: #1f2937;
      }
      .tags {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }
      .chip {
        background: #e0e7ff;
        color: #3730a3;
        font-size: 0.8rem;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
      }
      .time {
        margin-top: 0.4rem;
        font-size: 0.78rem;
        color: #9ca3af;
      }
      button {
        margin-top: 1rem;
        padding: 0.55rem 1rem;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: #b91c1c;
      }
    `,
  ],
})
export class FeedPage {
  private readonly api = inject(ApiService);

  protected readonly items = signal<FeedItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);
  private page = 0;

  constructor() {
    this.loadMore();
  }

  loadMore(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.feed(this.page).subscribe({
      next: (res) => {
        this.items.update((curr) => [...curr, ...res.items]);
        this.hasMore.set(res.hasMore);
        this.page += 1;
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'failed to load feed');
      },
    });
  }

  protected relative(iso: string): string {
    const t = new Date(iso).getTime();
    const diff = Date.now() - t;
    const minutes = Math.floor(diff / 60_000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }
}
