import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { RewardSuggestion } from '../../../core/types';
import { AdminTabsComponent } from '../admin-tabs/admin-tabs';

@Component({
  selector: 'app-admin-suggestions',
  imports: [DatePipe, FormsModule, AdminTabsComponent],
  template: `
    <section class="admin">
      <app-admin-tabs />
      <h2>Reward suggestions</h2>

      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (rows().length === 0) {
        <p class="muted">No suggestions submitted yet.</p>
      }

      <table class="grid">
        <thead>
          <tr>
            <th>Name</th>
            <th>Suggested by</th>
            <th>Votes</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          @for (s of rows(); track s.id) {
            <tr>
              <td>
                <strong>{{ s.name }}</strong>
                @if (s.description) { <div class="desc">{{ s.description }}</div> }
              </td>
              <td>{{ s.suggestedBy.name }}</td>
              <td><span class="votes">{{ s.voteCount }}</span></td>
              <td>{{ s.createdAt | date: 'medium' }}</td>
              <td>
                <span class="status" [class.open]="s.status === 'open'" [class.promoted]="s.status === 'promoted'" [class.dismissed]="s.status === 'dismissed'">
                  {{ s.status }}
                </span>
              </td>
              <td>
                @if (s.status === 'open') {
                  <div class="actions-cell">
                    <button type="button" class="promote" (click)="openPromote(s)" [disabled]="busyId() === s.id">Promote</button>
                    <button type="button" class="dismiss" (click)="dismiss(s)" [disabled]="busyId() === s.id">Dismiss</button>
                  </div>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>

      @if (error()) { <p class="error">{{ error() }}</p> }
    </section>

    @if (promoting(); as s) {
      <div class="backdrop" (click)="cancelPromote()" role="dialog" aria-modal="true">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-body">
            <h3>Promote suggestion to reward</h3>
            <p class="modal-desc">
              Create a real reward in the catalog using the suggestion's name + description.
              Set the point cost (you own the budget — the suggester didn't set it).
            </p>

            <dl class="summary">
              <div>
                <dt>Name</dt>
                <dd><strong>{{ s.name }}</strong></dd>
              </div>
              <div>
                <dt>Description</dt>
                <dd>{{ s.description || '(none)' }}</dd>
              </div>
              <div>
                <dt>Suggested by</dt>
                <dd>{{ s.suggestedBy.name }}</dd>
              </div>
              <div>
                <dt>Votes</dt>
                <dd>{{ s.voteCount }}</dd>
              </div>
            </dl>

            <label class="field">
              Cost (points) *
              <input type="number" min="1" required [(ngModel)]="promoteCost" name="cost" />
            </label>
            <label class="field">
              Image URL (optional, overrides suggestion's image)
              <input
                type="text"
                placeholder="https://… (leave blank to use suggestion's image)"
                [(ngModel)]="promoteImageUrl"
                name="imageUrl"
              />
            </label>

            @if (error()) { <p class="error">{{ error() }}</p> }

            <div class="modal-actions">
              <button type="button" class="ghost" (click)="cancelPromote()" [disabled]="busyId() === s.id">Cancel</button>
              <button type="button" class="promote-primary" (click)="confirmPromote()" [disabled]="busyId() === s.id || !promoteCost || promoteCost <= 0">
                {{ busyId() === s.id ? 'Promoting…' : 'Promote to reward' }}
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
      h2 { margin: 0 0 1rem; }
      .muted { color: var(--rise-muted); }
      .grid {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        overflow: hidden;
      }
      th, td {
        text-align: left;
        padding: 0.65rem 0.85rem;
        border-bottom: 1px solid var(--rise-line);
        font-size: 0.92rem;
        vertical-align: top;
      }
      th {
        background: var(--rise-pink-tint);
        color: var(--rise-pink-deep);
        font-weight: 600;
      }
      tr:last-child td { border-bottom: none; }
      .desc {
        color: var(--rise-muted);
        font-size: 0.82rem;
        margin-top: 0.15rem;
      }
      .votes {
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.85rem;
      }
      .status {
        padding: 0.15rem 0.6rem;
        border-radius: 999px;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: capitalize;
        background: var(--rise-line);
        color: var(--rise-muted);
      }
      .status.open      { background: var(--rise-warn-soft);  color: var(--rise-warn); }
      .status.promoted  { background: var(--rise-mint-soft);  color: var(--rise-mint); }
      .status.dismissed { background: var(--rise-error-soft); color: var(--rise-error); }
      .actions-cell {
        display: flex;
        gap: 0.35rem;
      }
      button {
        font-weight: 600;
        cursor: pointer;
        font-size: 0.85rem;
        border: none;
        padding: 0.35rem 0.85rem;
        border-radius: 999px;
      }
      button.promote {
        background: var(--rise-mint);
        color: white;
      }
      button.promote:hover:not(:disabled) { background: #4ade80; }
      button.dismiss {
        background: transparent;
        color: var(--rise-error);
        border: 1px solid var(--rise-error);
      }
      button.dismiss:hover:not(:disabled) { background: var(--rise-error-soft); }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      .error { color: var(--rise-error); margin: 0.5rem 0 0; }

      /* Modal */
      .backdrop {
        position: fixed; inset: 0;
        background: rgba(0, 0, 44, 0.55);
        display: grid; place-items: center;
        padding: 1.5rem; z-index: 100;
        animation: fade-in 0.15s ease;
      }
      .modal {
        background: var(--rise-card);
        border-radius: 16px;
        width: 100%; max-width: 460px;
        overflow: hidden;
        box-shadow: 0 30px 60px rgba(0, 0, 44, 0.4);
        animation: pop-in 0.18s ease;
      }
      .modal-body { padding: 1.4rem 1.5rem; }
      .modal-body h3 { margin: 0 0 0.35rem; color: var(--rise-ink); font-size: 1.2rem; }
      .modal-desc { margin: 0 0 1rem; color: var(--rise-muted); line-height: 1.4; }
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
        gap: 1rem;
        padding: 0.3rem 0;
        align-items: baseline;
      }
      .summary div + div { border-top: 1px dashed var(--rise-line); }
      .summary dt { margin: 0; font-size: 0.82rem; color: var(--rise-muted); }
      .summary dd { margin: 0; font-weight: 600; color: var(--rise-ink); text-align: right; max-width: 60%; }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        margin-bottom: 0.75rem;
        font-size: 0.85rem;
        color: var(--rise-muted);
      }
      .field input {
        padding: 0.45rem 0.6rem;
        border: 1px solid var(--rise-line-strong);
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.95rem;
      }
      .modal-actions {
        display: flex; justify-content: flex-end; gap: 0.5rem;
      }
      .modal-actions button {
        padding: 0.5rem 1.2rem;
        font-size: 0.9rem;
      }
      .ghost {
        background: transparent;
        color: var(--rise-muted);
        border: 1px solid var(--rise-line-strong);
      }
      .ghost:hover:not(:disabled) {
        background: var(--rise-card-elev);
        color: var(--rise-ink);
      }
      .promote-primary {
        background: var(--rise-mint);
        color: white;
      }
      .promote-primary:hover:not(:disabled) { background: #4ade80; }

      @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pop-in {
        from { opacity: 0; transform: translateY(8px) scale(0.97); }
        to   { opacity: 1; transform: none; }
      }
    `,
  ],
})
export class AdminSuggestionsPage {
  private readonly api = inject(ApiService);

  protected readonly rows = signal<RewardSuggestion[]>([]);
  protected readonly loading = signal(true);
  protected readonly busyId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly promoting = signal<RewardSuggestion | null>(null);

  promoteCost: number | null = null;
  promoteImageUrl = '';

  constructor() {
    this.refresh();
  }

  protected openPromote(s: RewardSuggestion): void {
    this.error.set(null);
    this.promoting.set(s);
    this.promoteCost = null;
    this.promoteImageUrl = '';
  }

  protected cancelPromote(): void {
    if (this.busyId() != null) return;
    this.promoting.set(null);
    this.error.set(null);
  }

  protected confirmPromote(): void {
    const s = this.promoting();
    if (!s || !this.promoteCost || this.promoteCost <= 0) return;
    this.busyId.set(s.id);
    this.error.set(null);
    this.api
      .adminPromoteSuggestion(s.id, {
        costPoints: this.promoteCost,
        imageUrl: this.promoteImageUrl.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.promoting.set(null);
          this.refresh();
        },
        error: (err) => {
          this.busyId.set(null);
          this.error.set(err?.error?.message ?? 'promote failed');
        },
      });
  }

  protected dismiss(s: RewardSuggestion): void {
    if (!confirm(`Dismiss "${s.name}"? Votes are preserved for audit; the suggestion is hidden from users.`)) return;
    this.busyId.set(s.id);
    this.error.set(null);
    this.api.adminDismissSuggestion(s.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.refresh();
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(err?.error?.message ?? 'dismiss failed');
      },
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.adminSuggestions().subscribe({
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
