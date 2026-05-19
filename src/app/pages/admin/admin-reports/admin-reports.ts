import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { ApiService } from '../../../core/api.service';
import { HashtagReportRow, LeaderboardRow, ReportWindow } from '../../../core/types';
import { AdminTabsComponent } from '../admin-tabs/admin-tabs';

@Component({
  selector: 'app-admin-reports',
  imports: [DatePipe, DecimalPipe, AdminTabsComponent],
  template: `
    <section class="admin">
      <app-admin-tabs />

      <div class="row">
        <h2>Recognition reports</h2>
        <div class="toggles">
          <div class="toggle" role="tablist" aria-label="Report window">
            <button
              type="button"
              role="tab"
              [class.active]="window() === 'month'"
              [attr.aria-selected]="window() === 'month'"
              (click)="setWindow('month')"
            >
              This month
            </button>
            <button
              type="button"
              role="tab"
              [class.active]="window() === 'all'"
              [attr.aria-selected]="window() === 'all'"
              (click)="setWindow('all')"
            >
              All time
            </button>
          </div>
          <div class="toggle" role="tablist" aria-label="Report view">
            <button
              type="button"
              role="tab"
              [class.active]="view() === 'table'"
              [attr.aria-selected]="view() === 'table'"
              (click)="view.set('table')"
            >
              Table
            </button>
            <button
              type="button"
              role="tab"
              [class.active]="view() === 'chart'"
              [attr.aria-selected]="view() === 'chart'"
              (click)="view.set('chart')"
            >
              Chart
            </button>
          </div>
        </div>
      </div>

      @if (error()) { <p class="error">{{ error() }}</p> }

      @if (loading() && hashtags().length === 0 && leaders().length === 0) {
        <p class="muted">Loading…</p>
      } @else if (!loading() && hashtags().length === 0 && leaders().length === 0) {
        <p class="muted">No activity in this window yet.</p>
      }

      <div class="grid-2" [class.dim]="loading()">
        <article class="card">
          <header>
            <h3>Top hashtags</h3>
            <span class="muted">{{ windowLabel() }}</span>
          </header>
          @if (hashtags().length === 0) {
            <p class="muted small">No hashtags in this window.</p>
          } @else if (view() === 'table') {
            <table class="grid">
              <thead>
                <tr>
                  <th>Hashtag</th>
                  <th>Recognitions</th>
                  <th>Points</th>
                  <th>Last used</th>
                </tr>
              </thead>
              <tbody>
                @for (h of hashtags(); track h.tag) {
                  <tr>
                    <td><span class="tag">#{{ h.tag }}</span></td>
                    <td>{{ h.recognitionCount | number }}</td>
                    <td>{{ h.pointsTotal | number }}</td>
                    <td class="muted">{{ h.lastUsedAt | date: 'mediumDate' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <ul class="bars">
              @for (h of hashtags(); track h.tag) {
                <li>
                  <div class="bar-label">
                    <span class="tag">#{{ h.tag }}</span>
                    <span class="bar-value">{{ h.recognitionCount | number }}</span>
                  </div>
                  <div class="bar-track">
                    <div
                      class="bar-fill hashtag"
                      [style.width.%]="pct(h.recognitionCount, maxHashtagCount())"
                    ></div>
                  </div>
                  <div class="bar-sub muted">{{ h.pointsTotal | number }} pts</div>
                </li>
              }
            </ul>
          }
        </article>

        <article class="card">
          <header>
            <h3>Top earners</h3>
            <span class="muted">{{ windowLabel() }}</span>
          </header>
          @if (leaders().length === 0) {
            <p class="muted small">No earners in this window.</p>
          } @else if (view() === 'table') {
            <table class="grid">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Points received</th>
                  <th>Recognitions</th>
                </tr>
              </thead>
              <tbody>
                @for (l of leaders(); track l.user.id; let i = $index) {
                  <tr>
                    <td>
                      <span class="rank" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                        {{ i + 1 }}
                      </span>
                    </td>
                    <td>
                      <strong>{{ l.user.name }}</strong>
                      <span class="muted-inline">{{ l.user.email }}</span>
                    </td>
                    <td><strong>{{ l.pointsReceived | number }}</strong></td>
                    <td>{{ l.recognitionCount | number }}</td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <ul class="bars">
              @for (l of leaders(); track l.user.id; let i = $index) {
                <li>
                  <div class="bar-label">
                    <span class="rank inline" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">{{ i + 1 }}</span>
                    <strong class="name">{{ l.user.name }}</strong>
                    <span class="bar-value">{{ l.pointsReceived | number }}</span>
                  </div>
                  <div class="bar-track">
                    <div
                      class="bar-fill leader"
                      [style.width.%]="pct(l.pointsReceived, maxPointsReceived())"
                    ></div>
                  </div>
                  <div class="bar-sub muted">{{ l.recognitionCount | number }} recognition{{ l.recognitionCount === 1 ? '' : 's' }}</div>
                </li>
              }
            </ul>
          }
        </article>
      </div>
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
        gap: 1rem;
        flex-wrap: wrap;
      }
      .row h2 {
        margin: 0;
      }
      .toggles {
        display: inline-flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .toggle {
        display: inline-flex;
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 999px;
        padding: 3px;
      }
      .toggle button {
        background: transparent;
        border: none;
        padding: 0.4rem 1rem;
        border-radius: 999px;
        font-weight: 600;
        font-size: 0.85rem;
        color: var(--rise-muted);
        cursor: pointer;
      }
      .toggle button.active {
        background: var(--rise-pink);
        color: white;
      }
      .toggle button:hover:not(.active) {
        color: var(--rise-ink);
      }
      .grid-2 {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: 1rem;
        transition: opacity 0.15s ease;
      }
      .grid-2.dim {
        opacity: 0.6;
      }
      .card {
        background: var(--rise-card);
        border: 1px solid var(--rise-line);
        border-radius: 12px;
        overflow: hidden;
      }
      .card header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        padding: 0.85rem 1rem;
        border-bottom: 1px solid var(--rise-line);
      }
      .card header h3 {
        margin: 0;
        font-size: 1rem;
      }
      .grid {
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
      }
      th,
      td {
        text-align: left;
        padding: 0.6rem 0.85rem;
        border-bottom: 1px solid var(--rise-line);
        font-size: 0.9rem;
      }
      th {
        background: var(--rise-pink-tint);
        color: var(--rise-pink-deep);
        font-weight: 600;
      }
      tr:last-child td {
        border-bottom: none;
      }
      .tag {
        background: var(--rise-pink-soft);
        color: var(--rise-pink-deep);
        padding: 0.15rem 0.55rem;
        border-radius: 999px;
        font-weight: 600;
        font-size: 0.82rem;
      }
      .muted {
        color: var(--rise-muted);
        font-size: 0.85rem;
      }
      .muted.small {
        padding: 0.85rem 1rem;
      }
      .muted-inline {
        color: var(--rise-muted);
        margin-left: 0.4rem;
        font-size: 0.82rem;
      }
      .rank {
        display: inline-grid;
        place-items: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: var(--rise-card-elev);
        color: var(--rise-muted);
        font-weight: 700;
        font-size: 0.85rem;
        border: 1px solid var(--rise-line);
      }
      .rank.gold {
        background: #fff7d6;
        color: #92400e;
        border-color: #f5d77a;
      }
      .rank.silver {
        background: #eef0f3;
        color: #475569;
        border-color: #cbd5e1;
      }
      .rank.bronze {
        background: #fbe7d4;
        color: #92400e;
        border-color: #e7b48a;
      }
      .error {
        color: var(--rise-error);
        margin: 0 0 0.75rem;
      }
      .bars {
        list-style: none;
        margin: 0;
        padding: 0.85rem 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
      }
      .bars li {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .bar-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
      }
      .bar-label .name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .bar-label .tag {
        flex: 0 0 auto;
      }
      .bar-value {
        margin-left: auto;
        font-weight: 700;
        color: var(--rise-ink);
        font-variant-numeric: tabular-nums;
      }
      .bar-track {
        background: var(--rise-card-elev);
        border: 1px solid var(--rise-line);
        height: 10px;
        border-radius: 999px;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        border-radius: 999px;
        transition: width 0.35s ease;
      }
      .bar-fill.hashtag {
        background: linear-gradient(90deg, var(--rise-pink) 0%, var(--rise-pink-deep) 100%);
      }
      .bar-fill.leader {
        background: linear-gradient(90deg, var(--rise-cyan-soft) 0%, var(--rise-cyan) 100%);
      }
      .bar-sub {
        font-size: 0.78rem;
      }
      .rank.inline {
        width: 22px;
        height: 22px;
        font-size: 0.75rem;
      }
    `,
  ],
})
export class AdminReportsPage {
  private readonly api = inject(ApiService);

  protected readonly window = signal<ReportWindow>('month');
  protected readonly view = signal<'table' | 'chart'>('chart');
  protected readonly hashtags = signal<HashtagReportRow[]>([]);
  protected readonly leaders = signal<LeaderboardRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly windowLabel = computed(() =>
    this.window() === 'month' ? 'This month' : 'All time',
  );
  protected readonly maxHashtagCount = computed(() =>
    this.hashtags().reduce((m, h) => Math.max(m, h.recognitionCount), 0),
  );
  protected readonly maxPointsReceived = computed(() =>
    this.leaders().reduce((m, l) => Math.max(m, l.pointsReceived), 0),
  );

  protected pct(value: number, max: number): number {
    if (max <= 0) return 0;
    return Math.max(2, Math.round((value / max) * 100));
  }

  private generation = 0;

  constructor() {
    this.refresh();
  }

  protected setWindow(next: ReportWindow): void {
    if (this.window() === next) return;
    this.window.set(next);
    this.refresh();
  }

  private refresh(): void {
    const gen = ++this.generation;
    this.loading.set(true);
    this.error.set(null);
    const w = this.window();
    forkJoin({
      hashtags: this.api.adminReportHashtags(w),
      leaders: this.api.adminReportLeaderboard(w),
    }).subscribe({
      next: ({ hashtags, leaders }) => {
        if (gen !== this.generation) return;
        this.hashtags.set(hashtags);
        this.leaders.set(leaders);
        this.loading.set(false);
      },
      error: (err) => {
        if (gen !== this.generation) return;
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'failed to load reports');
      },
    });
  }
}
