import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { RewardSuggestion } from '../../core/types';

@Component({
  selector: 'app-suggestions',
  imports: [FormsModule],
  template: `
    <section class="suggestions">
      @if (message(); as msg) {
        <div class="toast success" role="status">
          <span class="icon">✓</span>
          <span class="msg">{{ msg }}</span>
          <button (click)="message.set(null)" aria-label="Dismiss">×</button>
        </div>
      }
      @if (error(); as err) {
        <div class="toast error" role="alert">
          <span class="icon">!</span>
          <span class="msg">{{ err }}</span>
          <button (click)="error.set(null)" aria-label="Dismiss">×</button>
        </div>
      }

      <h2>Reward suggestions</h2>
      <p class="lead">
        Don't see a reward you'd actually use? Suggest one and rally votes — admins can promote
        popular ideas into the real catalog.
      </p>

      <form class="form" (submit)="submit($event)">
        <h3>Suggest a reward</h3>
        <div class="grid-form">
          <label>Name *
            <input type="text" maxlength="100" required [(ngModel)]="form.name" name="name" />
          </label>
          <label>Image URL (optional, https)
            <input type="text" placeholder="https://…" [(ngModel)]="form.imageUrl" name="imageUrl" />
          </label>
          <label class="full">Description (optional)
            <textarea rows="2" [(ngModel)]="form.description" name="description"></textarea>
          </label>
        </div>
        <div class="form-actions">
          <button type="submit" class="primary" [disabled]="submitting() || !form.name.trim()">
            {{ submitting() ? 'Submitting…' : 'Suggest reward' }}
          </button>
        </div>
      </form>

      @if (loading()) {
        <p class="muted">Loading…</p>
      } @else if (rows().length === 0) {
        <p class="muted">No suggestions yet — be the first.</p>
      }

      <ul class="list">
        @for (s of rows(); track s.id) {
          <li class="card">
            @if (s.imageUrl) {
              <img class="thumb" [src]="s.imageUrl" [alt]="s.name" />
            } @else {
              <div class="thumb empty">no image</div>
            }
            <div class="body">
              <h3>{{ s.name }}</h3>
              <p class="desc">{{ s.description || '(no description)' }}</p>
              <p class="meta">
                Suggested by <strong>{{ s.suggestedBy.name }}</strong>
                @if (canDelete(s)) {
                  · <button type="button" class="link" (click)="remove(s)">Delete</button>
                }
              </p>
            </div>
            <div class="vote">
              <button
                type="button"
                class="vote-btn"
                [class.voted]="s.hasVoted"
                (click)="toggleVote(s)"
                [disabled]="busyId() === s.id"
                [attr.aria-pressed]="s.hasVoted"
                [title]="s.hasVoted ? 'Click to unvote' : 'Click to vote'"
              >
                @if (s.hasVoted) { ♥ } @else { ♡ }
              </button>
              <span class="count">{{ s.voteCount }}</span>
            </div>
          </li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      .suggestions {
        max-width: 800px;
        margin: 1.5rem auto;
        padding: 0 1rem;
      }
      h2 { margin: 0 0 0.4rem; color: var(--rise-ink); }
      .lead {
        color: var(--rise-muted);
        margin: 0 0 1.25rem;
      }
      .muted { color: var(--rise-muted); }
      .form {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        padding: 1rem 1.25rem;
        margin: 0 0 1.5rem;
        box-shadow: 0 2px 10px rgba(17, 24, 39, 0.05);
      }
      .form h3 { margin: 0 0 0.75rem; }
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
      .grid-form label.full { grid-column: span 2; }
      .grid-form input,
      .grid-form textarea {
        padding: 0.45rem 0.6rem;
        border: 1px solid var(--rise-line-strong);
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.95rem;
      }
      .form-actions {
        margin-top: 0.8rem;
        display: flex;
        justify-content: flex-end;
      }
      .list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.7rem;
      }
      .card {
        display: flex;
        gap: 1rem;
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        padding: 0.9rem 1rem;
        box-shadow: 0 1px 5px rgba(17, 24, 39, 0.04);
      }
      .thumb {
        width: 96px;
        height: 80px;
        flex-shrink: 0;
        object-fit: cover;
        border-radius: 8px;
        background: var(--rise-card-elev);
      }
      .thumb.empty {
        display: grid;
        place-items: center;
        color: var(--rise-muted-soft);
        font-size: 0.75rem;
        border: 1px dashed var(--rise-line-strong);
      }
      .body { flex: 1; min-width: 0; }
      .body h3 { margin: 0 0 0.2rem; color: var(--rise-ink); font-size: 1rem; }
      .desc { margin: 0; color: var(--rise-muted); font-size: 0.9rem; }
      .meta {
        margin: 0.4rem 0 0;
        font-size: 0.8rem;
        color: var(--rise-muted);
      }
      .meta strong { color: var(--rise-ink); font-weight: 600; }
      .link {
        background: none;
        border: none;
        padding: 0;
        color: var(--rise-error);
        cursor: pointer;
        font-size: inherit;
        font-family: inherit;
        text-decoration: underline;
      }
      .vote {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.15rem;
        align-self: center;
        min-width: 44px;
      }
      .vote-btn {
        background: var(--rise-pink-tint);
        color: var(--rise-pink);
        border: 1px solid var(--rise-pink-soft);
        width: 44px;
        height: 44px;
        border-radius: 50%;
        font-size: 1.3rem;
        cursor: pointer;
        transition: transform 0.1s ease, background 0.12s ease;
      }
      .vote-btn:hover:not(:disabled) {
        background: var(--rise-pink-soft);
        transform: scale(1.05);
      }
      .vote-btn.voted {
        background: var(--rise-pink);
        color: white;
        border-color: var(--rise-pink);
      }
      .vote-btn:disabled { opacity: 0.55; cursor: not-allowed; }
      .count {
        font-size: 0.85rem;
        font-weight: 700;
        color: var(--rise-muted);
      }
      button.primary {
        background: var(--rise-pink);
        color: white;
        border: none;
        padding: 0.5rem 1.2rem;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
      }
      button.primary:hover:not(:disabled) { background: var(--rise-pink-deep); }
      button.primary:disabled { opacity: 0.5; cursor: not-allowed; }

      .toast {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: 10px;
        margin: 0 0 1rem;
        border: 1px solid;
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
      .toast .icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: grid;
        place-items: center;
        font-weight: 700;
        color: white;
      }
      .toast.success .icon { background: var(--rise-mint); color: #064e3b; }
      .toast.error .icon { background: var(--rise-error); color: white; }
      .toast .msg { flex: 1; font-size: 0.9rem; }
      .toast button {
        background: transparent;
        border: none;
        color: inherit;
        opacity: 0.55;
        font-size: 1.3rem;
        line-height: 1;
        cursor: pointer;
      }
      .toast button:hover { opacity: 1; }
      @keyframes slide-in {
        from { opacity: 0; transform: translateY(-6px); }
        to   { opacity: 1; transform: none; }
      }
    `,
  ],
})
export class SuggestionsPage {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  protected readonly rows = signal<RewardSuggestion[]>([]);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly busyId = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  form = { name: '', description: '', imageUrl: '' };

  protected readonly meId = computed(() => this.auth.currentUser()?.id);
  protected readonly isAdmin = computed(() => this.auth.currentUser()?.isAdmin === true);

  constructor() {
    this.refresh();
  }

  protected canDelete(s: RewardSuggestion): boolean {
    return this.isAdmin() || s.suggestedBy.id === this.meId();
  }

  protected submit(event: Event): void {
    event.preventDefault();
    if (!this.form.name.trim()) return;
    this.submitting.set(true);
    this.error.set(null);
    this.api
      .createSuggestion({
        name: this.form.name.trim(),
        description: this.form.description.trim(),
        imageUrl: this.form.imageUrl.trim(),
      })
      .subscribe({
        next: (created) => {
          this.submitting.set(false);
          this.form = { name: '', description: '', imageUrl: '' };
          this.message.set(`Suggested "${created.name}" — your vote is already in.`);
          this.refresh();
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.message ?? 'submit failed');
        },
      });
  }

  protected toggleVote(s: RewardSuggestion): void {
    this.busyId.set(s.id);
    this.error.set(null);
    this.api.voteSuggestion(s.id).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.replace(updated);
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(err?.error?.message ?? 'vote failed');
      },
    });
  }

  protected remove(s: RewardSuggestion): void {
    if (!confirm(`Delete "${s.name}"? This removes the suggestion and all its votes.`)) return;
    this.busyId.set(s.id);
    this.error.set(null);
    this.api.deleteSuggestion(s.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.rows.update((rs) => rs.filter((r) => r.id !== s.id));
      },
      error: (err) => {
        this.busyId.set(null);
        this.error.set(err?.error?.message ?? 'delete failed');
      },
    });
  }

  private replace(updated: RewardSuggestion): void {
    this.rows.update((rs) => {
      const next = rs.map((r) => (r.id === updated.id ? updated : r));
      next.sort((a, b) => b.voteCount - a.voteCount || b.createdAt.localeCompare(a.createdAt));
      return next;
    });
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.suggestions().subscribe({
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
