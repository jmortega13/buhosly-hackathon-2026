import { Component, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { MeProfile, Reward } from '../../core/types';

@Component({
  selector: 'app-rewards',
  template: `
    <section class="rewards">
      <h2>Rewards</h2>
      @if (me(); as m) {
        <p class="balance">Your earned balance: <strong>{{ m.earnedBalance }}</strong></p>
      }
      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (rewards().length === 0) {
        <p class="muted">No rewards available right now.</p>
      }
      <div class="grid">
        @for (r of rewards(); track r.id) {
          <div class="card">
            @if (r.imageUrl) { <img [src]="r.imageUrl" [alt]="r.name" /> }
            <div class="body">
              <h3>{{ r.name }}</h3>
              <p>{{ r.description }}</p>
              <div class="bottom">
                <span class="cost">{{ r.costPoints }} pts</span>
                <button
                  type="button"
                  [disabled]="!canAfford(r) || redeeming() === r.id"
                  (click)="redeem(r)"
                >
                  {{ redeeming() === r.id ? 'Redeeming…' : 'Redeem' }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
      @if (message()) { <p class="success">{{ message() }}</p> }
      @if (error()) { <p class="error">{{ error() }}</p> }
    </section>
  `,
  styles: [
    `
      .rewards {
        max-width: 920px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .balance {
        color: #374151;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
      }
      .card {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .card img {
        width: 100%;
        height: 140px;
        object-fit: cover;
        background: #f3f4f6;
      }
      .body {
        padding: 0.9rem 1rem 1rem;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      h3 {
        margin: 0 0 0.3rem;
      }
      p {
        margin: 0;
        color: #4b5563;
        font-size: 0.9rem;
        flex: 1;
      }
      .bottom {
        margin-top: 0.8rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .cost {
        background: #fef3c7;
        color: #92400e;
        font-weight: 600;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        font-size: 0.85rem;
      }
      button {
        background: #16a34a;
        color: white;
        border: none;
        padding: 0.45rem 0.9rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .muted {
        color: #6b7280;
      }
      .success {
        color: #166534;
      }
      .error {
        color: #b91c1c;
      }
    `,
  ],
})
export class RewardsPage {
  private readonly api = inject(ApiService);

  protected readonly rewards = signal<Reward[]>([]);
  protected readonly me = signal<MeProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly redeeming = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  protected canAfford(r: Reward): boolean {
    const m = this.me();
    return m != null && m.earnedBalance >= r.costPoints;
  }

  protected redeem(r: Reward): void {
    this.message.set(null);
    this.error.set(null);
    this.redeeming.set(r.id);
    this.api.redeem(r.id).subscribe({
      next: () => {
        this.redeeming.set(null);
        this.message.set(`Redeemed "${r.name}" (${r.costPoints} pts).`);
        this.api.me().subscribe({ next: (m) => this.me.set(m) });
      },
      error: (err) => {
        this.redeeming.set(null);
        this.error.set(err?.error?.message ?? 'redemption failed');
      },
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.rewards().subscribe({
      next: (rs) => {
        this.rewards.set(rs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.me().subscribe({ next: (m) => this.me.set(m) });
  }
}
