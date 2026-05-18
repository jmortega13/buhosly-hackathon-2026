import { Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from './core/auth.service';
import { NavComponent } from './shared/nav/nav';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavComponent],
  template: `
    @if (showNav()) {
      <app-nav />
    }
    <router-outlet />
  `,
  styleUrl: './app.scss',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  protected readonly showNav = computed(
    () => this.auth.isAuthenticated() && !this.currentUrl().startsWith('/login')
  );
}
