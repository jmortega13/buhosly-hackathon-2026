import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { AdminRewardRow } from '../../../core/types';
import { AdminTabsComponent } from '../admin-tabs/admin-tabs';

interface RewardForm {
  name: string;
  description: string;
  costPoints: number | null;
  imageUrl: string;
}

const EMPTY: RewardForm = { name: '', description: '', costPoints: null, imageUrl: '' };

@Component({
  selector: 'app-admin-rewards',
  imports: [FormsModule, AdminTabsComponent],
  template: `
    <section class="admin">
      <app-admin-tabs />
      <div class="row">
        <h2>Rewards</h2>
        <button type="button" class="primary" (click)="openCreate()">+ Add reward</button>
      </div>

      @if (creating()) {
        <form class="form" (submit)="submitCreate($event)">
          <h3>New reward</h3>
          <div class="grid-form">
            <label>Name<input type="text" [(ngModel)]="form.name" name="name" required /></label>
            <label>Cost (points)<input type="number" min="1" [(ngModel)]="form.costPoints" name="cost" required /></label>
            <label class="full">Description<textarea rows="2" [(ngModel)]="form.description" name="description"></textarea></label>
            <label class="full">Image URL (https, optional)<input type="text" placeholder="https://…" [(ngModel)]="form.imageUrl" name="imageUrl" /></label>
          </div>
          @if (error()) { <p class="error">{{ error() }}</p> }
          <div class="actions">
            <button type="button" class="ghost" (click)="cancel()">Cancel</button>
            <button type="submit" class="primary" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Create' }}</button>
          </div>
        </form>
      }

      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (rows().length === 0) {
        <p class="muted">No rewards yet — click "Add reward" to create one.</p>
      }

      <ul class="list">
        @for (r of rows(); track r.id) {
          <li class="card" [class.inactive]="!r.active">
            @if (editingId() === r.id) {
              <form class="form" (submit)="submitEdit($event, r)">
                <div class="grid-form">
                  <label>Name<input type="text" [(ngModel)]="form.name" name="name" required /></label>
                  <label>Cost<input type="number" min="1" [(ngModel)]="form.costPoints" name="cost" required /></label>
                  <label class="full">Description<textarea rows="2" [(ngModel)]="form.description" name="description"></textarea></label>
                  <label class="full">Image URL<input type="text" placeholder="https://…" [(ngModel)]="form.imageUrl" name="imageUrl" /></label>
                  <label class="check">
                    <input type="checkbox" [(ngModel)]="editActive" name="active" />
                    Active
                  </label>
                </div>
                @if (error()) { <p class="error">{{ error() }}</p> }
                <div class="actions">
                  <button type="button" class="ghost" (click)="cancel()">Cancel</button>
                  <button type="submit" class="primary" [disabled]="busy()">{{ busy() ? 'Saving…' : 'Save' }}</button>
                </div>
              </form>
            } @else {
              <div class="reward-row">
                @if (r.imageUrl) {
                  <img class="thumb" [src]="r.imageUrl" [alt]="r.name" />
                } @else {
                  <div class="thumb empty">no image</div>
                }
                <div class="body">
                  <div class="title">
                    <strong>{{ r.name }}</strong>
                    @if (!r.active) { <span class="badge">inactive</span> }
                  </div>
                  <p class="desc">{{ r.description }}</p>
                  <p class="meta">{{ r.costPoints }} pts</p>
                </div>
                <div class="card-actions">
                  <button type="button" (click)="openEdit(r)">Edit</button>
                  <button type="button" class="ghost" (click)="softDelete(r)" [disabled]="!r.active">Deactivate</button>
                </div>
              </div>
            }
          </li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      .admin {
        max-width: 1000px;
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
      }
      .list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
      }
      .card {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        padding: 0.85rem 1rem;
      }
      .card.inactive {
        opacity: 0.7;
      }
      .reward-row {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .thumb {
        width: 100px;
        height: 80px;
        object-fit: cover;
        border-radius: 8px;
        background: var(--rise-card-elev);
        flex-shrink: 0;
      }
      .thumb.empty {
        display: grid;
        place-items: center;
        color: var(--rise-muted-soft);
        font-size: 0.75rem;
        border: 1px dashed var(--rise-line-strong);
      }
      .body {
        flex: 1;
      }
      .title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .badge {
        background: var(--rise-line);
        color: var(--rise-muted);
        font-size: 0.7rem;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .desc {
        color: var(--rise-muted);
        margin: 0.2rem 0;
        font-size: 0.9rem;
      }
      .meta {
        margin: 0;
        font-size: 0.85rem;
        color: var(--rise-pink-deep);
        font-weight: 600;
      }
      .card-actions {
        display: flex;
        gap: 0.4rem;
        align-self: flex-start;
      }
      .form {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        padding: 1rem 1.2rem;
        margin-bottom: 1rem;
      }
      .form h3 {
        margin: 0 0 0.75rem;
      }
      .grid-form {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      .grid-form label {
        display: flex;
        flex-direction: column;
        font-size: 0.85rem;
        gap: 0.25rem;
        color: var(--rise-muted);
      }
      .grid-form label.full {
        grid-column: span 2;
      }
      .grid-form label.check {
        flex-direction: row;
        align-items: center;
        gap: 0.4rem;
      }
      .grid-form input,
      .grid-form textarea {
        padding: 0.45rem 0.6rem;
        border: 1px solid var(--rise-line-strong);
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.95rem;
      }
      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.4rem;
        margin-top: 0.75rem;
      }
      button {
        background: var(--rise-pink);
        color: white;
        border: none;
        padding: 0.4rem 1rem;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
      }
      button:hover:not(:disabled) {
        background: var(--rise-pink-deep);
      }
      button.primary { background: var(--rise-pink); }
      button.ghost {
        background: transparent;
        color: var(--rise-muted);
        border: 1px solid var(--rise-line-strong);
      }
      button.ghost:hover:not(:disabled) {
        color: var(--rise-ink);
      }
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      .error {
        color: var(--rise-error);
        margin: 0.5rem 0 0;
      }
    `,
  ],
})
export class AdminRewardsPage {
  private readonly api = inject(ApiService);

  protected readonly rows = signal<AdminRewardRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly creating = signal(false);
  protected readonly editingId = signal<string | null>(null);

  form: RewardForm = { ...EMPTY };
  editActive = true;

  constructor() {
    this.refresh();
  }

  protected openCreate(): void {
    this.error.set(null);
    this.creating.set(true);
    this.editingId.set(null);
    this.form = { ...EMPTY };
  }

  protected openEdit(r: AdminRewardRow): void {
    this.error.set(null);
    this.creating.set(false);
    this.editingId.set(r.id);
    this.form = {
      name: r.name,
      description: r.description,
      costPoints: r.costPoints,
      imageUrl: r.imageUrl,
    };
    this.editActive = r.active;
  }

  protected cancel(): void {
    this.creating.set(false);
    this.editingId.set(null);
    this.error.set(null);
  }

  protected submitCreate(event: Event): void {
    event.preventDefault();
    if (!this.form.name.trim() || !this.form.costPoints || this.form.costPoints <= 0) {
      this.error.set('Name and a positive cost are required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api
      .adminCreateReward({
        name: this.form.name.trim(),
        description: this.form.description,
        costPoints: this.form.costPoints,
        imageUrl: this.form.imageUrl.trim(),
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.creating.set(false);
          this.refresh();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message ?? 'create failed');
        },
      });
  }

  protected submitEdit(event: Event, r: AdminRewardRow): void {
    event.preventDefault();
    if (!this.form.name.trim() || !this.form.costPoints || this.form.costPoints <= 0) {
      this.error.set('Name and a positive cost are required.');
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.api
      .adminUpdateReward(r.id, {
        name: this.form.name.trim(),
        description: this.form.description,
        costPoints: this.form.costPoints,
        imageUrl: this.form.imageUrl.trim(),
        active: this.editActive,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.editingId.set(null);
          this.refresh();
        },
        error: (err) => {
          this.busy.set(false);
          this.error.set(err?.error?.message ?? 'update failed');
        },
      });
  }

  protected softDelete(r: AdminRewardRow): void {
    if (!confirm(`Deactivate "${r.name}"? Existing redemptions are unaffected.`)) return;
    this.busy.set(true);
    this.api.adminDeleteReward(r.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.refresh();
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'delete failed');
      },
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.adminRewards().subscribe({
      next: (rs) => {
        this.rows.set(rs);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
