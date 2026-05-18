import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiService } from '../../core/api.service';
import { MeProfile, UserBrief } from '../../core/types';

const ALLOWED_HASHTAGS = ['teamwork', 'ownership', 'impact', 'kindness'];

@Component({
  selector: 'app-give',
  imports: [FormsModule],
  template: `
    <section class="give">
      <h2>Give recognition</h2>

      <div class="field">
        <label>Recipients</label>
        <div class="picker">
          <input
            type="text"
            placeholder="Type a name…"
            [(ngModel)]="filter"
            name="filter"
            (focus)="open.set(true)"
          />
          @if (open() && filteredCandidates().length > 0) {
            <ul class="dropdown">
              @for (u of filteredCandidates(); track u.id) {
                <li (click)="add(u)">{{ u.name }} <span class="email">{{ u.email }}</span></li>
              }
            </ul>
          }
        </div>
        <div class="chips">
          @for (u of selected(); track u.id) {
            <span class="chip">
              {{ u.name }}
              <button type="button" (click)="remove(u)" aria-label="Remove">×</button>
            </span>
          }
        </div>
      </div>

      <div class="field">
        <label>Amount per recipient</label>
        <input type="number" min="1" [(ngModel)]="amount" name="amount" />
        <p class="hint">
          Total cost: <strong>{{ totalCost() }}</strong> /
          remaining giving balance: <strong>{{ me()?.givingBalance ?? '—' }}</strong>
          @if (overBudget()) {
            <span class="error">— exceeds your allowance</span>
          }
        </p>
      </div>

      <div class="field">
        <label>Message</label>
        <textarea rows="3" [(ngModel)]="message" name="message" placeholder="What did they do?"></textarea>
      </div>

      <div class="field">
        <label>Hashtags</label>
        <div class="tagchoices">
          @for (h of allowedHashtags; track h) {
            <label class="tagchoice">
              <input type="checkbox" [checked]="hashtags().includes(h)" (change)="toggleTag(h)" />
              <span class="chip">#{{ h }}</span>
            </label>
          }
        </div>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <button type="button" (click)="submit()" [disabled]="!canSubmit() || submitting()">
        {{ submitting() ? 'Sending…' : 'Send recognition' }}
      </button>
    </section>
  `,
  styles: [
    `
      .give {
        max-width: 640px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .field {
        margin-bottom: 1.1rem;
      }
      label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.3rem;
        color: #374151;
      }
      input[type='text'],
      input[type='number'],
      textarea {
        width: 100%;
        padding: 0.55rem 0.7rem;
        font-size: 1rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        box-sizing: border-box;
      }
      .picker {
        position: relative;
      }
      .dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin: 0;
        padding: 0;
        list-style: none;
        background: white;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        max-height: 200px;
        overflow: auto;
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      }
      .dropdown li {
        padding: 0.45rem 0.7rem;
        cursor: pointer;
      }
      .dropdown li:hover {
        background: #f3f4f6;
      }
      .dropdown .email {
        color: #9ca3af;
        font-size: 0.82rem;
        margin-left: 0.4rem;
      }
      .chips {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
        margin-top: 0.5rem;
      }
      .chip {
        background: #e0e7ff;
        color: #3730a3;
        padding: 0.2rem 0.6rem;
        border-radius: 999px;
        font-size: 0.85rem;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }
      .chip button {
        background: none;
        border: none;
        color: #3730a3;
        font-weight: 700;
        cursor: pointer;
        font-size: 1rem;
        padding: 0;
        line-height: 1;
      }
      .tagchoices {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .tagchoice {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        cursor: pointer;
        font-weight: 400;
        margin: 0;
      }
      .hint {
        font-size: 0.85rem;
        color: #4b5563;
        margin: 0.3rem 0 0;
      }
      .error {
        color: #b91c1c;
      }
      button[type='button']:not(.chip button) {
        background: #2563eb;
        color: white;
        padding: 0.65rem 1.4rem;
        font-weight: 600;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 1rem;
      }
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
})
export class GivePage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  protected readonly allowedHashtags = ALLOWED_HASHTAGS;
  protected readonly me = signal<MeProfile | null>(null);
  protected readonly candidates = signal<UserBrief[]>([]);
  protected readonly selected = signal<UserBrief[]>([]);
  protected readonly hashtags = signal<string[]>([]);
  protected readonly open = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  filter = '';
  amount = 1;
  message = '';

  protected readonly totalCost = computed(() => this.amount * this.selected().length);
  protected readonly overBudget = computed(() => {
    const m = this.me();
    return m != null && this.totalCost() > m.givingBalance;
  });

  protected readonly filteredCandidates = computed(() => {
    const f = this.filter.trim().toLowerCase();
    const selectedIds = new Set(this.selected().map((u) => u.id));
    return this.candidates()
      .filter((u) => !selectedIds.has(u.id))
      .filter((u) => f === '' || u.name.toLowerCase().includes(f) || (u.email ?? '').toLowerCase().includes(f))
      .slice(0, 20);
  });

  protected readonly canSubmit = computed(
    () =>
      this.selected().length > 0 &&
      this.amount > 0 &&
      !this.overBudget() &&
      this.message.trim().length > 0 &&
      this.hashtags().length > 0
  );

  constructor() {
    this.api.me().subscribe({ next: (m) => this.me.set(m) });
    this.api.listUsers().subscribe({ next: (us) => this.candidates.set(us) });
  }

  add(u: UserBrief): void {
    this.selected.update((curr) => (curr.some((x) => x.id === u.id) ? curr : [...curr, u]));
    this.filter = '';
    this.open.set(false);
  }

  remove(u: UserBrief): void {
    this.selected.update((curr) => curr.filter((x) => x.id !== u.id));
  }

  toggleTag(h: string): void {
    this.hashtags.update((curr) =>
      curr.includes(h) ? curr.filter((t) => t !== h) : [...curr, h]
    );
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.error.set(null);
    this.submitting.set(true);
    this.api
      .give({
        recipientIds: this.selected().map((u) => u.id),
        amount: this.amount,
        message: this.message.trim(),
        hashtags: this.hashtags(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.router.navigateByUrl('/feed');
        },
        error: (err) => {
          this.submitting.set(false);
          this.error.set(err?.error?.message ?? 'failed to send');
        },
      });
  }
}
