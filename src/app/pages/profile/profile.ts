import { Component, inject, signal } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { MeProfile } from '../../core/types';

@Component({
  selector: 'app-profile',
  template: `
    <section class="profile">
      <h2>Profile</h2>
      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (me(); as m) {
        <div class="card">
          <div class="row"><span class="label">Name</span><strong>{{ m.name }}</strong></div>
          <div class="row"><span class="label">Email</span>{{ m.email }}</div>
          <div class="row">
            <span class="label">Giving balance</span>
            <strong>{{ m.givingBalance }}</strong>
            <span class="muted">for {{ m.givingMonth }}</span>
          </div>
          <div class="row">
            <span class="label">Earned balance</span>
            <strong>{{ m.earnedBalance }}</strong>
            <span class="muted">redeemable</span>
          </div>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .profile {
        max-width: 560px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      h2 {
        color: var(--rise-ink);
      }
      .card {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 14px;
        padding: 1.25rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        box-shadow: 0 2px 10px rgba(17, 24, 39, 0.05);
      }
      .row {
        display: grid;
        grid-template-columns: 140px 1fr auto;
        align-items: baseline;
        gap: 0.5rem;
      }
      .label {
        color: var(--rise-muted);
        font-size: 0.85rem;
      }
      .muted {
        color: var(--rise-muted-soft);
        font-size: 0.85rem;
      }
      strong {
        color: var(--rise-pink);
      }
    `,
  ],
})
export class ProfilePage {
  private readonly api = inject(ApiService);

  protected readonly me = signal<MeProfile | null>(null);
  protected readonly loading = signal(true);

  constructor() {
    this.api.me().subscribe({
      next: (m) => {
        this.me.set(m);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
