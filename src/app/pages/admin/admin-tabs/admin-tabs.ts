import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs">
      <a routerLink="/admin/users" routerLinkActive="active">Users</a>
      <a routerLink="/admin/rewards" routerLinkActive="active">Rewards</a>
      <a routerLink="/admin/suggestions" routerLinkActive="active">Suggestions</a>
      <a routerLink="/admin/redemptions" routerLinkActive="active">Redemptions</a>
      <a routerLink="/admin/reports" routerLinkActive="active">Reports</a>
    </nav>
  `,
  styles: [
    `
      .tabs {
        display: flex;
        gap: 0.4rem;
        margin: 0 0 1.25rem;
        border-bottom: 1px solid var(--rise-line);
      }
      .tabs a {
        text-decoration: none;
        color: var(--rise-muted);
        padding: 0.55rem 1rem;
        border-radius: 8px 8px 0 0;
        font-weight: 500;
      }
      .tabs a:hover {
        color: var(--rise-ink);
      }
      .tabs a.active {
        color: var(--rise-pink-deep);
        background: var(--rise-pink-tint);
        border-bottom: 2px solid var(--rise-pink);
      }
    `,
  ],
})
export class AdminTabsComponent {}
