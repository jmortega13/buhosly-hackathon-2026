import { Component, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { CelebrateService } from '../../core/celebrate.service';
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
                  (click)="redeem(r, $event)"
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
      h2 {
        color: var(--rise-ink);
      }
      .balance {
        color: var(--rise-muted);
      }
      .balance strong {
        color: var(--rise-mint);
        background: var(--rise-mint-soft);
        padding: 0.1rem 0.6rem;
        border-radius: 999px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 1rem;
      }
      .card {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 14px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 2px 10px rgba(17, 24, 39, 0.05);
      }
      .card img {
        width: 100%;
        height: 140px;
        object-fit: cover;
        background: var(--rise-card-elev);
      }
      .body {
        padding: 0.9rem 1rem 1rem;
        display: flex;
        flex-direction: column;
        flex: 1;
      }
      h3 {
        margin: 0 0 0.3rem;
        color: var(--rise-ink);
      }
      p {
        margin: 0;
        color: var(--rise-muted);
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
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        font-weight: 600;
        padding: 0.2rem 0.65rem;
        border-radius: 999px;
        font-size: 0.85rem;
      }
      button {
        background: var(--rise-pink);
        color: white;
        border: none;
        padding: 0.45rem 1.1rem;
        border-radius: 999px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      button:hover:not(:disabled) {
        background: var(--rise-pink-deep);
      }
      button:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .muted {
        color: var(--rise-muted);
      }
      .success {
        color: var(--rise-mint);
      }
      .error {
        color: var(--rise-error);
      }
    `,
  ],
})
export class RewardsPage {
  private readonly api = inject(ApiService);
  private readonly celebrate = inject(CelebrateService);

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

  protected redeem(r: Reward, event: MouseEvent): void {
    this.message.set(null);
    this.error.set(null);
    this.redeeming.set(r.id);
    const anchor = event.currentTarget as HTMLElement | null;
    this.api.redeem(r.id).subscribe({
      next: () => {
        this.redeeming.set(null);
        this.message.set(`Redeemed "${r.name}" (${r.costPoints} pts).`);
        this.celebrate.redemption(anchor);
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
