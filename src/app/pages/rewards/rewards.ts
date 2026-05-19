import { Component, computed, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { CelebrateService } from '../../core/celebrate.service';
import { MeProfile, Reward } from '../../core/types';

@Component({
  selector: 'app-rewards',
  template: `
    <section class="rewards">
      @if (message(); as msg) {
        <div class="toast success" role="status">
          <span class="toast-icon" aria-hidden="true">✓</span>
          <div class="toast-body">
            <strong>Redemption queued</strong>
            <span>{{ msg }} It's now <em>pending</em> admin approval — track it under "My redemptions".</span>
          </div>
          <button type="button" class="toast-close" (click)="dismissMessage()" aria-label="Dismiss">×</button>
        </div>
      }
      @if (error(); as err) {
        <div class="toast error" role="alert">
          <span class="toast-icon" aria-hidden="true">!</span>
          <div class="toast-body">
            <strong>Something went wrong</strong>
            <span>{{ err }}</span>
          </div>
          <button type="button" class="toast-close" (click)="dismissError()" aria-label="Dismiss">×</button>
        </div>
      }

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
                  [disabled]="!canAfford(r)"
                  (click)="openConfirm(r, $event)"
                >
                  Redeem
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </section>

    @if (confirming(); as r) {
      <div class="backdrop" (click)="cancel()" role="dialog" aria-modal="true">
        <div class="modal" (click)="$event.stopPropagation()">
          @if (r.imageUrl) {
            <img class="hero" [src]="r.imageUrl" [alt]="r.name" />
          }
          <div class="modal-body">
            <h3>{{ r.name }}</h3>
            <p class="desc">{{ r.description }}</p>

            <dl class="summary">
              <div>
                <dt>Reward cost</dt>
                <dd class="cost-row">−{{ r.costPoints }} pts</dd>
              </div>
              <div>
                <dt>Your earned balance</dt>
                <dd>{{ me()?.earnedBalance ?? 0 }} pts</dd>
              </div>
              <div class="after">
                <dt>After redeeming</dt>
                <dd>{{ balanceAfter() }} pts</dd>
              </div>
            </dl>

            <p class="note">Redemptions are queued as <strong>pending</strong>. You can view them under "My redemptions".</p>

            @if (error()) { <p class="error">{{ error() }}</p> }

            <div class="actions">
              <button type="button" class="ghost" (click)="cancel()" [disabled]="busy()">Cancel</button>
              <button
                type="button"
                class="primary"
                #confirmBtn
                (click)="confirm(confirmBtn)"
                [disabled]="busy()"
              >
                {{ busy() ? 'Redeeming…' : 'Confirm redemption' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
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

      /* Toast banner — sits at the top of the page above the H2. */
      .toast {
        display: flex;
        align-items: flex-start;
        gap: 0.85rem;
        padding: 0.85rem 1rem;
        border-radius: 12px;
        margin: 0 0 1.25rem;
        border: 1px solid;
        box-shadow: 0 4px 16px rgba(17, 24, 39, 0.06);
        animation: slide-in 0.18s ease;
      }
      .toast.success {
        background: var(--rise-mint-soft);
        border-color: var(--rise-mint);
        color: #064e3b;
      }
      .toast.error {
        background: var(--rise-error-soft);
        border-color: var(--rise-error);
        color: var(--rise-error);
      }
      .toast-icon {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-weight: 800;
        color: white;
      }
      .toast.success .toast-icon { background: var(--rise-mint); color: #064e3b; }
      .toast.error .toast-icon   { background: var(--rise-error); color: white; }
      .toast-body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        line-height: 1.4;
      }
      .toast-body strong {
        font-size: 0.95rem;
      }
      .toast-body span {
        font-size: 0.88rem;
        opacity: 0.92;
      }
      .toast-body em {
        font-style: normal;
        font-weight: 600;
      }
      .toast-close {
        background: transparent;
        border: none;
        color: inherit;
        opacity: 0.55;
        font-size: 1.4rem;
        line-height: 1;
        padding: 0 0.35rem;
        cursor: pointer;
        align-self: flex-start;
        margin-top: -0.1rem;
      }
      .toast-close:hover {
        opacity: 1;
      }
      @keyframes slide-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: none; }
      }

      /* Confirmation modal */
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 44, 0.55);
        display: grid;
        place-items: center;
        padding: 1.5rem;
        z-index: 100;
        animation: fade-in 0.15s ease;
      }
      .modal {
        background: var(--rise-card);
        border-radius: 16px;
        width: 100%;
        max-width: 440px;
        overflow: hidden;
        box-shadow: 0 30px 60px rgba(0, 0, 44, 0.4);
        animation: pop-in 0.18s ease;
      }
      .hero {
        display: block;
        width: 100%;
        height: 180px;
        object-fit: cover;
      }
      .modal-body {
        padding: 1.4rem 1.5rem;
      }
      .modal-body h3 {
        margin: 0 0 0.35rem;
        color: var(--rise-ink);
        font-size: 1.2rem;
      }
      .desc {
        margin: 0 0 1rem;
        color: var(--rise-muted);
      }
      .summary {
        margin: 0 0 1rem;
        padding: 0.75rem 1rem;
        background: var(--rise-card-elev);
        border-radius: 10px;
        border: 1px solid var(--rise-line);
      }
      .summary div {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0.25rem 0;
      }
      .summary dt {
        margin: 0;
        font-size: 0.85rem;
        color: var(--rise-muted);
      }
      .summary dd {
        margin: 0;
        font-weight: 600;
        color: var(--rise-ink);
      }
      .summary .cost-row {
        color: var(--rise-pink-deep);
      }
      .summary .after {
        border-top: 1px dashed var(--rise-line);
        margin-top: 0.35rem;
        padding-top: 0.5rem;
      }
      .summary .after dt,
      .summary .after dd {
        color: var(--rise-mint);
        font-weight: 700;
      }
      .note {
        margin: 0 0 1rem;
        font-size: 0.82rem;
        color: var(--rise-muted-soft);
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .primary { background: var(--rise-pink); }
      .ghost {
        background: transparent;
        color: var(--rise-muted);
        border: 1px solid var(--rise-line-strong);
      }
      .ghost:hover:not(:disabled) {
        background: var(--rise-card-elev);
        color: var(--rise-ink);
      }

      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pop-in {
        from { opacity: 0; transform: translateY(8px) scale(0.97); }
        to { opacity: 1; transform: none; }
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
  protected readonly busy = signal(false);
  protected readonly confirming = signal<Reward | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  private redeemAnchor: HTMLElement | null = null;
  private dismissTimer?: number;

  protected readonly balanceAfter = computed(() => {
    const m = this.me();
    const r = this.confirming();
    if (!m || !r) return 0;
    return m.earnedBalance - r.costPoints;
  });

  constructor() {
    this.refresh();
  }

  protected canAfford(r: Reward): boolean {
    const m = this.me();
    return m != null && m.earnedBalance >= r.costPoints;
  }

  protected openConfirm(r: Reward, event: MouseEvent): void {
    this.message.set(null);
    this.error.set(null);
    this.redeemAnchor = event.currentTarget as HTMLElement | null;
    this.confirming.set(r);
  }

  protected cancel(): void {
    if (this.busy()) return;
    this.confirming.set(null);
    this.error.set(null);
  }

  protected confirm(confirmBtn: HTMLElement): void {
    const r = this.confirming();
    if (!r) return;
    this.busy.set(true);
    this.error.set(null);
    this.api.redeem(r.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirming.set(null);
        this.flashMessage(`Redeemed "${r.name}" for ${r.costPoints} pts.`);
        // Burst from the original card button when possible; fall back to the
        // modal's confirm button (which is what the user just clicked).
        this.celebrate.redemption(this.redeemAnchor ?? confirmBtn);
        this.api.me().subscribe({ next: (m) => this.me.set(m) });
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'redemption failed');
      },
    });
  }

  protected dismissMessage(): void {
    this.message.set(null);
    if (this.dismissTimer != null) {
      window.clearTimeout(this.dismissTimer);
      this.dismissTimer = undefined;
    }
  }

  protected dismissError(): void {
    this.error.set(null);
  }

  private flashMessage(text: string): void {
    this.message.set(text);
    if (this.dismissTimer != null) window.clearTimeout(this.dismissTimer);
    this.dismissTimer = window.setTimeout(() => this.message.set(null), 6000);
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
