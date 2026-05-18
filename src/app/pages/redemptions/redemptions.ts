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
      .list {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .row {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 0.7rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .info {
        display: flex;
        flex-direction: column;
      }
      .date {
        color: #9ca3af;
        font-size: 0.8rem;
      }
      .meta {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      .cost {
        background: #fef3c7;
        color: #92400e;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .status {
        background: #e5e7eb;
        color: #374151;
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
      }
      .status.pending {
        background: #fef3c7;
        color: #92400e;
      }
      .muted {
        color: #6b7280;
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
