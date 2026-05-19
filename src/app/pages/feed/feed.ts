import { Component, ViewChild, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { CelebrateService } from '../../core/celebrate.service';
import { BirthdayUser, FeedItem, MeProfile } from '../../core/types';
import { ComposerComponent } from '../../shared/composer/composer';

@Component({
  selector: 'app-feed',
  imports: [ComposerComponent],
  template: `
    @if (birthdayToast(); as me) {
      <div class="birthday-toast" role="status">
        <span class="cake">🎂</span>
        <div class="msg">
          <strong>Happy birthday, {{ me.name.split(' ')[0] }}!</strong>
          <span>buhosly gifted you <strong>+{{ topupAmount() }}</strong> earned points — go redeem yourself something nice 🎁</span>
        </div>
        <button type="button" (click)="dismissBirthdayToast()" aria-label="Dismiss">×</button>
      </div>
    }

    <section class="feed">
      <app-composer (posted)="onPosted()" />

      @for (b of birthdays(); track b.id) {
        <div class="birthday-banner" role="status">
          <span class="cake">🎂</span>
          <span class="msg">
            It's <strong>{{ b.name }}</strong>'s birthday today —
            <button type="button" class="link" (click)="celebrateBirthday(b)">send them recognition →</button>
          </span>
        </div>
      }

      <h2>Recognition feed</h2>
      @if (loading() && items().length === 0) {
        <p class="muted">Loading…</p>
      } @else if (items().length === 0) {
        <p class="muted">No recognitions yet. Be the first to give one!</p>
      }
      <ul class="list">
        @for (item of items(); track item.createdAt + '-' + item.giver.id) {
          <li class="card">
            <div class="header">
              <strong>{{ item.giver.name }}</strong>
              <span class="arrow">→</span>
              <span class="recipients">
                @for (r of item.recipients ?? []; track r.id; let last = $last) {
                  <strong>{{ r.name }}</strong>@if (!last) {<span>,&nbsp;</span>}
                }
              </span>
              <span class="amount">
                +{{ item.amount }}@if ((item.recipients?.length ?? 0) > 1) {
                  <span class="multi">&nbsp;each ({{ item.totalAmount ?? item.amount * (item.recipients?.length ?? 1) }} total)</span>
                }
              </span>
            </div>
            <p class="message">{{ item.message }}</p>
            @if (item.hashtags.length) {
              <div class="tags">
                @for (h of item.hashtags; track h) {
                  <span class="chip">#{{ h }}</span>
                }
              </div>
            }
            @if (item.gifUrl) {
              <img class="gif" [src]="item.gifUrl" [alt]="'recognition gif'" loading="lazy" />
            }
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
        margin: 1.5rem auto;
        padding: 0 1rem;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }
      h2 {
        margin: 0;
        color: var(--rise-ink);
      }
      .muted {
        color: var(--rise-muted);
      }
      .list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .card {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 14px;
        padding: 1rem 1.1rem;
        box-shadow: 0 2px 10px rgba(17, 24, 39, 0.05);
        overflow: hidden;
      }
      .header {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 1rem;
        color: var(--rise-ink);
        flex-wrap: wrap;
      }
      .header strong {
        color: var(--rise-ink);
      }
      .arrow {
        color: var(--rise-muted-soft);
      }
      .recipients {
        display: inline-flex;
        flex-wrap: wrap;
        align-items: baseline;
      }
      .amount {
        margin-left: auto;
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        font-weight: 700;
        padding: 0.15rem 0.65rem;
        border-radius: 999px;
        white-space: nowrap;
      }
      .amount .multi {
        font-weight: 500;
        font-size: 0.82rem;
        opacity: 0.85;
      }
      .message {
        margin: 0.55rem 0 0.4rem;
        color: var(--rise-ink);
      }
      .gif {
        display: block;
        width: calc(100% + 2.2rem);
        margin: 0.6rem -1.1rem;
        max-width: none;
        border-top: 1px solid var(--rise-line);
        border-bottom: 1px solid var(--rise-line);
        background: var(--rise-body);
      }
      .tags {
        display: flex;
        gap: 0.35rem;
        flex-wrap: wrap;
      }
      .chip {
        background: var(--rise-purple-soft);
        color: var(--rise-purple);
        font-size: 0.8rem;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
      }
      .time {
        margin-top: 0.4rem;
        font-size: 0.78rem;
        color: var(--rise-muted-soft);
      }
      button {
        align-self: flex-start;
        padding: 0.55rem 1.2rem;
        background: var(--rise-pink);
        color: white;
        border: none;
        border-radius: 999px;
        cursor: pointer;
        font-weight: 600;
      }
      button:hover:not(:disabled) {
        background: var(--rise-pink-deep);
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: var(--rise-error);
      }

      .birthday-banner,
      .birthday-toast {
        display: flex;
        align-items: center;
        gap: 0.8rem;
        padding: 0.7rem 1rem;
        border-radius: 12px;
        animation: slide-in 0.2s ease;
      }
      .birthday-banner {
        background: linear-gradient(95deg, var(--rise-pink-soft), var(--rise-pink-tint));
        border: 1px solid var(--rise-pink-soft);
        color: var(--rise-pink-deep);
      }
      .birthday-toast {
        max-width: 720px;
        margin: 1.25rem auto 0;
        padding: 0.85rem 1rem;
        background: var(--rise-mint-soft);
        border: 1px solid var(--rise-mint);
        color: #064e3b;
        box-shadow: 0 4px 16px rgba(17, 24, 39, 0.06);
      }
      .birthday-banner .cake,
      .birthday-toast .cake {
        font-size: 1.5rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .birthday-banner .msg,
      .birthday-toast .msg {
        flex: 1;
        line-height: 1.4;
      }
      .birthday-toast .msg {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
      }
      .birthday-toast .msg span {
        font-size: 0.88rem;
        opacity: 0.92;
      }
      .birthday-banner .link {
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        color: var(--rise-pink-deep);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        text-decoration: underline;
        align-self: auto;
      }
      .birthday-banner .link:hover {
        color: var(--rise-pink);
      }
      .birthday-toast button {
        background: transparent;
        border: none;
        color: inherit;
        font-size: 1.4rem;
        line-height: 1;
        padding: 0 0.35rem;
        opacity: 0.55;
        cursor: pointer;
        align-self: flex-start;
        margin: 0;
      }
      .birthday-toast button:hover {
        opacity: 1;
      }
      @keyframes slide-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: none; }
      }
    `,
  ],
})
export class FeedPage {
  private readonly api = inject(ApiService);
  private readonly celebrate = inject(CelebrateService);

  @ViewChild(ComposerComponent) composer?: ComposerComponent;

  protected readonly items = signal<FeedItem[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly hasMore = signal(false);
  protected readonly birthdays = signal<BirthdayUser[]>([]);
  protected readonly birthdayToast = signal<MeProfile | null>(null);
  protected readonly topupAmount = signal<number>(0);
  private page = 0;

  constructor() {
    this.loadMore();
    this.loadBirthdays();
    this.maybeShowBirthdayToast();
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

  protected onPosted(): void {
    this.items.set([]);
    this.page = 0;
    this.hasMore.set(false);
    this.loadMore();
  }

  protected celebrateBirthday(user: BirthdayUser): void {
    this.composer?.prefillBirthday(user);
    // Smooth-scroll the page to the composer so the user sees the pre-filled text.
    queueMicrotask(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  protected dismissBirthdayToast(): void {
    this.birthdayToast.set(null);
  }

  private loadBirthdays(): void {
    this.api.birthdaysToday().subscribe({
      next: (rows) => this.birthdays.set(rows),
      error: () => this.birthdays.set([]),
    });
  }

  /**
   * Show the celebratory mint toast at most once per calendar day per user,
   * keyed off localStorage so a reload doesn't re-show. /me already carries
   * the `birthdayTopupAppliedToday` flag, which stays true all day on the
   * user's birthday after the top-up — the localStorage gate de-dupes.
   */
  private maybeShowBirthdayToast(): void {
    this.api.me().subscribe({
      next: (me) => {
        if (!me.birthdayTopupAppliedToday) return;
        const today = new Date().toISOString().slice(0, 10);
        const key = `birthdayToastShown:${today}`;
        if (localStorage.getItem(key)) return;
        this.topupAmount.set(me.birthdayTopUpAmount ?? 0);
        this.birthdayToast.set(me);
        localStorage.setItem(key, '1');
        this.celebrate.recognition();
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
