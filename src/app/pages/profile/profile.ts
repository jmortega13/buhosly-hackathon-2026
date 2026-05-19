import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../core/api.service';
import { MeProfile } from '../../core/types';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const DAYS_IN_MONTH: Record<string, number> = {
  '01': 31, '02': 29, '03': 31, '04': 30, '05': 31, '06': 30,
  '07': 31, '08': 31, '09': 30, '10': 31, '11': 30, '12': 31,
};

@Component({
  selector: 'app-profile',
  imports: [FormsModule],
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
            <span class="label">Giveable balance</span>
            <strong>{{ m.givingBalance }}</strong>
            <span class="muted">for {{ m.givingMonth }}</span>
          </div>
          <div class="row">
            <span class="label">Earned balance</span>
            <strong>{{ m.earnedBalance }}</strong>
            <span class="muted">redeemable</span>
          </div>
        </div>

        <div class="card birthday-card">
          <div class="birthday-head">
            <strong>🎂 Birthday</strong>
            @if (m.birthday) {
              <span class="muted-inline">on file: {{ formatBirthday(m.birthday) }}</span>
            }
          </div>
          <p class="hint">
            Optional. We only store month and day — no year. Setting it powers the
            feed banner and the once-a-year giving-points top-up.
          </p>
          <div class="picker">
            <select [(ngModel)]="month" name="month">
              <option value="">Month</option>
              @for (mo of months; track mo.value) {
                <option [value]="mo.value">{{ mo.label }}</option>
              }
            </select>
            <select [(ngModel)]="day" name="day" [disabled]="!month">
              <option value="">Day</option>
              @for (d of daysFor(month); track d) {
                <option [value]="d">{{ d }}</option>
              }
            </select>
            <button type="button" class="primary" (click)="save()" [disabled]="busy() || !canSave()">
              {{ busy() ? 'Saving…' : (m.birthday ? 'Update' : 'Set birthday') }}
            </button>
            @if (m.birthday) {
              <button type="button" class="ghost" (click)="clear()" [disabled]="busy()">Clear</button>
            }
          </div>
          @if (savedMessage()) { <p class="success">{{ savedMessage() }}</p> }
          @if (error()) { <p class="error">{{ error() }}</p> }
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
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      h2 { color: var(--rise-ink); margin: 0; }
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
      .muted-inline {
        color: var(--rise-muted);
        font-size: 0.85rem;
      }
      strong {
        color: var(--rise-pink);
      }
      .birthday-card .birthday-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.5rem;
      }
      .birthday-card .birthday-head strong {
        color: var(--rise-ink);
      }
      .birthday-card .hint {
        color: var(--rise-muted);
        font-size: 0.85rem;
        margin: 0;
      }
      .picker {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
        align-items: center;
        margin-top: 0.25rem;
      }
      select {
        padding: 0.45rem 0.6rem;
        border: 1px solid var(--rise-line-strong);
        border-radius: 6px;
        font-family: inherit;
        font-size: 0.95rem;
        background: white;
      }
      select:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      button {
        padding: 0.45rem 1rem;
        border-radius: 999px;
        font-weight: 600;
        cursor: pointer;
        border: none;
        font-size: 0.9rem;
      }
      button.primary {
        background: var(--rise-pink);
        color: white;
      }
      button.primary:hover:not(:disabled) {
        background: var(--rise-pink-deep);
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
      button:disabled { opacity: 0.5; cursor: not-allowed; }
      .success {
        color: var(--rise-mint);
        margin: 0.5rem 0 0;
        font-size: 0.85rem;
      }
      .error {
        color: var(--rise-error);
        margin: 0.5rem 0 0;
        font-size: 0.85rem;
      }
    `,
  ],
})
export class ProfilePage {
  private readonly api = inject(ApiService);

  protected readonly months = MONTHS;
  protected readonly me = signal<MeProfile | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly savedMessage = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  month = '';
  day = '';

  protected readonly canSave = computed(() => this.month !== '' && this.day !== '');

  constructor() {
    this.refresh();
  }

  protected daysFor(month: string): number[] {
    const max = DAYS_IN_MONTH[month] ?? 31;
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  protected formatBirthday(mmdd: string): string {
    const [mm, dd] = mmdd.split('-');
    const month = MONTHS.find((m) => m.value === mm)?.label ?? mm;
    return `${month} ${parseInt(dd, 10)}`;
  }

  protected save(): void {
    if (!this.canSave()) return;
    const value = `${this.month}-${this.day.padStart(2, '0')}`;
    this.busy.set(true);
    this.error.set(null);
    this.savedMessage.set(null);
    this.api.setBirthday(value).subscribe({
      next: (m) => {
        this.busy.set(false);
        this.me.set(m);
        this.savedMessage.set('Birthday saved.');
        this.applyBirthdayInputs(m.birthday);
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'save failed');
      },
    });
  }

  protected clear(): void {
    this.busy.set(true);
    this.error.set(null);
    this.savedMessage.set(null);
    this.api.setBirthday(null).subscribe({
      next: (m) => {
        this.busy.set(false);
        this.me.set(m);
        this.month = '';
        this.day = '';
        this.savedMessage.set('Birthday cleared.');
      },
      error: (err) => {
        this.busy.set(false);
        this.error.set(err?.error?.message ?? 'clear failed');
      },
    });
  }

  private refresh(): void {
    this.api.me().subscribe({
      next: (m) => {
        this.me.set(m);
        this.applyBirthdayInputs(m.birthday);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  private applyBirthdayInputs(value: string | null | undefined): void {
    if (!value) {
      this.month = '';
      this.day = '';
      return;
    }
    this.month = value.substring(0, 2);
    this.day = String(parseInt(value.substring(3, 5), 10));
  }
}
