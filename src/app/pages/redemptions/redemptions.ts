import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { Redemption } from '../../core/types';

@Component({
  selector: 'app-redemptions',
  template: `
    <section class="redemptions">
      <h2>My redemptions</h2>
      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (items().length === 0) {
        <p class="muted">You haven't redeemed any rewards yet.</p>
      }
      <ul class="list">
        @for (r of items(); track r.id) {
          <li class="row">
            <div class="info">
              <strong>{{ r.rewardName }}</strong>
              <span class="date">{{ r.createdAt | date:'medium' }}</span>
            </div>
            <div class="meta">
              <span class="cost">{{ r.costPoints }} pts</span>
              <span class="status" [class.pending]="r.status === 'pending'">{{ r.status }}</span>
            </div>
          </li>
        }
      </ul>
    </section>
  `,
  imports: [DatePipe],
  styles: [
    `
      .redemptions {
        max-width: 720px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      h2 {
        color: var(--rise-ink);
      }
      .list {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .row {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        padding: 0.7rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 4px rgba(17, 24, 39, 0.04);
      }
      .info {
        display: flex;
        flex-direction: column;
      }
      .info strong {
        color: var(--rise-ink);
      }
      .date {
        color: var(--rise-muted-soft);
        font-size: 0.8rem;
      }
      .meta {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .cost {
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        padding: 0.15rem 0.65rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .status {
        background: var(--rise-line);
        color: var(--rise-muted);
        padding: 0.15rem 0.65rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: capitalize;
      }
      .status.pending {
        background: var(--rise-warn-soft);
        color: var(--rise-warn);
      }
      .muted {
        color: var(--rise-muted);
      }
    `,
  ],
})
export class RedemptionsPage {
  private readonly api = inject(ApiService);

  protected readonly items = signal<Redemption[]>([]);
  protected readonly loading = signal(true);

  constructor() {
    this.api.myRedemptions().subscribe({
      next: (rs) => {
        this.items.set(rs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
