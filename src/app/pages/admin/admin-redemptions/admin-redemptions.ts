import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';

import { ApiService } from '../../../core/api.service';
import { AdminRedemptionRow } from '../../../core/types';
import { AdminTabsComponent } from '../admin-tabs/admin-tabs';

interface ConfirmingAction {
  type: 'approve' | 'reject';
  redemption: AdminRedemptionRow;
}

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

    @if (confirmingAction(); as ca) {
      <div class="backdrop" (click)="cancelConfirm()" role="dialog" aria-modal="true">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-body">
            <h3>
              {{ ca.type === 'approve' ? 'Approve redemption' : 'Reject redemption' }}
            </h3>
            <p class="modal-desc">
              @if (ca.type === 'approve') {
                Mark this redemption as <strong>fulfilled</strong>? No balance changes — the user already paid when they redeemed.
              } @else {
                Cancel this redemption and <strong>refund {{ ca.redemption.costPoints }} pts</strong> back to the user's earned balance. This cannot be undone from the UI.
              }
            </p>

            <dl class="summary">
              <div>
                <dt>User</dt>
                <dd>
                  <strong>{{ ca.redemption.user.name }}</strong>
                  <span class="muted-inline">{{ ca.redemption.user.email }}</span>
                </dd>
              </div>
              <div>
                <dt>Reward</dt>
                <dd>{{ ca.redemption.reward.name }}</dd>
              </div>
              <div>
                <dt>Points</dt>
                <dd [class.refund]="ca.type === 'reject'">
                  {{ ca.type === 'reject' ? '+' : '−' }}{{ ca.redemption.costPoints }} pts
                </dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{{ ca.redemption.createdAt | date: 'medium' }}</dd>
              </div>
            </dl>

            @if (error()) { <p class="error">{{ error() }}</p> }

            <div class="modal-actions">
              <button
                type="button"
                class="ghost"
                (click)="cancelConfirm()"
                [disabled]="busyId() === ca.redemption.id"
              >
                Cancel
              </button>
              <button
                type="button"
                [class.approve-primary]="ca.type === 'approve'"
                [class.reject-primary]="ca.type === 'reject'"
                (click)="confirmAction()"
                [disabled]="busyId() === ca.redemption.id"
              >
                {{
                  busyId() === ca.redemption.id
                    ? 'Working…'
                    : ca.type === 'approve'
                      ? 'Confirm approval'
                      : 'Confirm rejection'
                }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
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
        color: white;
      }
      button.approve:hover:not(:disabled) {
        background: #4ade80;
        color: white;
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
        max-width: 460px;
        overflow: hidden;
        box-shadow: 0 30px 60px rgba(0, 0, 44, 0.4);
        animation: pop-in 0.18s ease;
      }
      .modal-body {
        padding: 1.4rem 1.5rem;
      }
      .modal-body h3 {
        margin: 0 0 0.35rem;
        color: var(--rise-ink);
        font-size: 1.2rem;
      }
      .modal-desc {
        margin: 0 0 1rem;
        color: var(--rise-muted);
        line-height: 1.4;
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
        padding: 0.3rem 0;
        gap: 1rem;
      }
      .summary div + div {
        border-top: 1px dashed var(--rise-line);
      }
      .summary dt {
        margin: 0;
        font-size: 0.82rem;
        color: var(--rise-muted);
      }
      .summary dd {
        margin: 0;
        font-weight: 600;
        color: var(--rise-ink);
        text-align: right;
      }
      .summary dd.refund {
        color: var(--rise-mint);
      }
      .muted-inline {
        color: var(--rise-muted);
        font-weight: 400;
        margin-left: 0.4rem;
        font-size: 0.85rem;
      }
      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
      }
      .modal-actions button {
        padding: 0.5rem 1.2rem;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        font-size: 0.9rem;
      }
      .modal-actions .ghost {
        background: transparent;
        color: var(--rise-muted);
        border: 1px solid var(--rise-line-strong);
      }
      .modal-actions .ghost:hover:not(:disabled) {
        background: var(--rise-card-elev);
        color: var(--rise-ink);
      }
      .modal-actions .approve-primary {
        background: var(--rise-mint);
        color: white;
      }
      .modal-actions .approve-primary:hover:not(:disabled) {
        background: #4ade80;
      }
      .modal-actions .reject-primary {
        background: var(--rise-error);
        color: white;
      }
      .modal-actions .reject-primary:hover:not(:disabled) {
        background: #991b1b;
      }
      .modal-actions button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
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
export class AdminRedemptionsPage {
  private readonly api = inject(ApiService);

  protected readonly rows = signal<AdminRedemptionRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly exporting = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmingAction = signal<ConfirmingAction | null>(null);

  constructor() {
    this.refresh();
  }

  protected approve(r: AdminRedemptionRow): void {
    this.error.set(null);
    this.confirmingAction.set({ type: 'approve', redemption: r });
  }

  protected reject(r: AdminRedemptionRow): void {
    this.error.set(null);
    this.confirmingAction.set({ type: 'reject', redemption: r });
  }

  protected cancelConfirm(): void {
    if (this.busyId() != null) return;
    this.confirmingAction.set(null);
    this.error.set(null);
  }

  protected confirmAction(): void {
    const ca = this.confirmingAction();
    if (!ca) return;
    this.error.set(null);
    this.busyId.set(ca.redemption.id);
    const obs =
      ca.type === 'approve'
        ? this.api.adminApproveRedemption(ca.redemption.id)
        : this.api.adminRejectRedemption(ca.redemption.id);
    obs.subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.confirmingAction.set(null);
        this.replace(updated);
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(err?.error?.message ?? `${ca.type} failed`);
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
