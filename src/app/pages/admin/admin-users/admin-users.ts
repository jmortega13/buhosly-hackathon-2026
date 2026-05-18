import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { AdminUserRow } from '../../../core/types';
import { AdminTabsComponent } from '../admin-tabs/admin-tabs';

@Component({
  selector: 'app-admin-users',
  imports: [FormsModule, AdminTabsComponent],
  template: `
    <section class="admin">
      <app-admin-tabs />
      <h2>Users</h2>

      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (rows().length === 0) {
        <p class="muted">No users yet.</p>
      }

      <table class="grid">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Giving</th>
            <th>Earned</th>
            <th>Monthly override</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (u of rows(); track u.id) {
            <tr>
              <td><strong>{{ u.name }}</strong></td>
              <td class="muted">{{ u.email }}</td>
              <td>{{ u.givingBalance }} <span class="muted">({{ u.givingMonth }})</span></td>
              <td>{{ u.earnedBalance }}</td>
              <td>{{ u.monthlyAllowance ?? 'default' }}</td>
              <td>
                <button type="button" (click)="toggle(u.id)">
                  {{ expanded() === u.id ? 'Close' : 'Manage' }}
                </button>
              </td>
            </tr>
            @if (expanded() === u.id) {
              <tr class="form-row">
                <td colspan="6">
                  <div class="forms">
                    <form class="inline" (submit)="topUp($event, u)">
                      <label>Top up <strong>{{ u.name }}</strong> (current month)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="amount"
                        [(ngModel)]="topUpAmount"
                        name="topUpAmount"
                        required
                      />
                      <button type="submit" [disabled]="busy()">Top up</button>
                    </form>
                    <form class="inline" (submit)="saveOverride($event, u)">
                      <label>Set monthly override (kicks in next month)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 100"
                        [(ngModel)]="overrideAmount"
                        name="overrideAmount"
                      />
                      <button type="submit" [disabled]="busy()">Save</button>
                      <button type="button" class="ghost" (click)="clearOverride(u)" [disabled]="busy()">
                        Clear (use default)
                      </button>
                    </form>
                  </div>
                  @if (error()) { <p class="error">{{ error() }}</p> }
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </section>
  `,
  styles: [
    `
      .admin {
        max-width: 1000px;
        margin: 1.5rem auto;
        padding: 0 1rem;
      }
      h2 {
        margin: 0 0 1rem;
      }
      .muted {
        color: var(--rise-muted);
      }
      .grid {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        overflow: hidden;
      }
      th,
      td {
        text-align: left;
        padding: 0.7rem 0.85rem;
        border-bottom: 1px solid var(--rise-line);
        font-size: 0.92rem;
      }
      th {
        background: var(--rise-pink-tint);
        color: var(--rise-pink-deep);
        font-weight: 600;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .form-row td {
        background: var(--rise-card-elev);
      }
      .forms {
        display: flex;
        flex-wrap: wrap;
        gap: 1.5rem;
      }
      .inline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.4rem;
      }
      .inline label {
        flex-basis: 100%;
        font-size: 0.85rem;
        color: var(--rise-muted);
        margin-bottom: 0.1rem;
      }
      input[type='number'] {
        width: 100px;
        padding: 0.4rem 0.6rem;
        border: 1px solid var(--rise-line-strong);
        border-radius: 6px;
      }
      button {
        background: var(--rise-pink);
        color: white;
        border: none;
        padding: 0.4rem 0.95rem;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--rise-pink-deep);
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      button.ghost {
        background: transparent;
        color: var(--rise-muted);
        border: 1px solid var(--rise-line-strong);
      }
      button.ghost:hover:not(:disabled) {
        background: var(--rise-card-elev);
        color: var(--rise-ink);
      }
      .error {
        color: var(--rise-error);
        margin: 0.5rem 0 0;
      }
    `,
  ],
})
export class AdminUsersPage {
  private readonly api = inject(ApiService);

  protected readonly rows = signal<AdminUserRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expanded = signal<string | null>(null);

  topUpAmount: number | null = null;
  overrideAmount: number | null = null;

  constructor() {
    this.refresh();
  }

  protected toggle(id: string): void {
    this.error.set(null);
    this.topUpAmount = null;
    this.overrideAmount = null;
    this.expanded.update((curr) => (curr === id ? null : id));
  }

  protected topUp(event: Event, u: AdminUserRow): void {
    event.preventDefault();
    if (!this.topUpAmount || this.topUpAmount <= 0) {
      this.error.set('Amount must be a positive integer.');
      return;
    }
    this.runAdminCall(this.api.adminTopUp(u.id, this.topUpAmount), () => (this.topUpAmount = null));
  }

  protected saveOverride(event: Event, u: AdminUserRow): void {
    event.preventDefault();
    if (this.overrideAmount == null || this.overrideAmount <= 0) {
      this.error.set('Override must be a positive integer.');
      return;
    }
    this.runAdminCall(this.api.adminSetMonthlyAllowance(u.id, this.overrideAmount), () => (this.overrideAmount = null));
  }

  protected clearOverride(u: AdminUserRow): void {
    this.runAdminCall(this.api.adminSetMonthlyAllowance(u.id, null), () => (this.overrideAmount = null));
  }

  private runAdminCall<T>(obs: import('rxjs').Observable<T>, onSuccess: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    obs.subscribe({
      next: () => {
        this.busy.set(false);
        onSuccess();
        this.refresh();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'request failed');
      },
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.adminUsers().subscribe({
      next: (rs) => {
        this.rows.set(rs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
