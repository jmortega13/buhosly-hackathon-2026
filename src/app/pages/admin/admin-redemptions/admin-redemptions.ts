import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ApiService } from '../../../core/api.service';
import { AdminRedemptionRow } from '../../../core/types';
import { AdminTabsComponent } from '../admin-tabs/admin-tabs';

@Component({
  selector: 'app-admin-redemptions',
  imports: [DatePipe, AdminTabsComponent],
  template: `
    <section class="admin">
      <app-admin-tabs />
      <div class="row">
        <h2>All redemptions</h2>
        <button type="button" class="primary" (click)="downloadCsv()" [disabled]="exporting()">
          {{ exporting() ? 'Exporting…' : 'Export CSV' }}
        </button>
      </div>

      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (rows().length === 0) {
        <p class="muted">No redemptions yet.</p>
      }

      <table class="grid">
        <thead>
          <tr>
            <th>When</th>
            <th>User</th>
            <th>Reward</th>
            <th>Points</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (r of rows(); track r.id) {
            <tr>
              <td>{{ r.createdAt | date: 'medium' }}</td>
              <td>
                <strong>{{ r.user.name }}</strong>
                <span class="muted">{{ r.user.email }}</span>
              </td>
              <td>{{ r.reward.name }}</td>
              <td>{{ r.costPoints }}</td>
              <td>
                <span class="status" [class.pending]="r.status === 'pending'" [class.fulfilled]="r.status === 'fulfilled'" [class.cancelled]="r.status === 'cancelled'">{{ r.status }}</span>
              </td>
              <td>
                @if (r.status === 'pending') {
                  <div class="actions-cell">
                    <button
                      type="button"
                      class="approve"
                      (click)="approve(r)"
                      [disabled]="busyId() === r.id"
                    >
                      {{ busyId() === r.id ? '…' : 'Approve' }}
                    </button>
                    <button
                      type="button"
                      class="reject"
                      (click)="reject(r)"
                      [disabled]="busyId() === r.id"
                    >
                      Reject
                    </button>
                  </div>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (error()) { <p class="error">{{ error() }}</p> }
    </section>
  `,
  styles: [
    `
      .admin {
        max-width: 1100px;
        margin: 1.5rem auto;
        padding: 0 1rem;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
      }
      .row h2 {
        margin: 0;
      }
      .muted {
        color: var(--rise-muted);
        font-size: 0.85rem;
        margin-left: 0.5rem;
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
      .status {
        background: var(--rise-line);
        color: var(--rise-muted);
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: capitalize;
      }
      .status.pending {
        background: var(--rise-warn-soft);
        color: var(--rise-warn);
      }
      .status.fulfilled {
        background: var(--rise-mint-soft);
        color: var(--rise-mint);
      }
      .status.cancelled {
        background: var(--rise-error-soft);
        color: var(--rise-error);
      }
      .actions-cell {
        display: flex;
        gap: 0.35rem;
      }
      button {
        background: var(--rise-pink);
        color: white;
        border: none;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
        font-size: 0.85rem;
      }
      button.primary {
        background: var(--rise-pink);
        padding: 0.5rem 1.2rem;
      }
      button.primary:hover:not(:disabled) {
        background: var(--rise-pink-deep);
      }
      button.approve {
        background: var(--rise-mint);
        color: #064e3b;
      }
      button.approve:hover:not(:disabled) {
        background: #4ade80;
      }
      button.reject {
        background: transparent;
        color: var(--rise-error);
        border: 1px solid var(--rise-error);
      }
      button.reject:hover:not(:disabled) {
        background: var(--rise-error-soft);
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .error {
        color: var(--rise-error);
        margin: 0.5rem 0 0;
      }
    `,
  ],
})
export class AdminRedemptionsPage {
  private readonly api = inject(ApiService);

  protected readonly rows = signal<AdminRedemptionRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly exporting = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.refresh();
  }

  protected approve(r: AdminRedemptionRow): void {
    if (!confirm(`Approve "${r.reward.name}" for ${r.user.name}? Status will become "fulfilled".`)) return;
    this.error.set(null);
    this.busyId.set(r.id);
    this.api.adminApproveRedemption(r.id).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replace(updated);
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(err?.error?.message ?? 'approve failed');
      },
    });
  }

  protected reject(r: AdminRedemptionRow): void {
    if (
      !confirm(
        `Reject "${r.reward.name}" for ${r.user.name}? This refunds ${r.costPoints} pts to their earned balance and marks the redemption as cancelled.`
      )
    ) {
      return;
    }
    this.error.set(null);
    this.busyId.set(r.id);
    this.api.adminRejectRedemption(r.id).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replace(updated);
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(err?.error?.message ?? 'reject failed');
      },
    });
  }

  protected downloadCsv(): void {
    this.exporting.set(true);
    this.error.set(null);
    this.api.adminRedemptionsCsv().subscribe({
      next: (blob) => {
        this.exporting.set(false);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `redemptions-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
      error: (err) => {
        this.exporting.set(false);
        this.error.set(err?.error?.message ?? 'export failed');
      },
    });
  }

  private replace(updated: AdminRedemptionRow): void {
    this.rows.update((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.adminRedemptions().subscribe({
      next: (rs) => {
        this.rows.set(rs);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'failed to load');
      },
    });
  }
}
