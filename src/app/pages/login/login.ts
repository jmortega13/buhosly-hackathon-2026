import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth.service';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GsiInitConfig) => void;
          renderButton: (element: HTMLElement, options: GsiButtonOptions) => void;
        };
      };
    };
  }
}

interface GsiInitConfig {
  client_id: string;
  callback: (response: { credential: string }) => void;
  auto_select?: boolean;
  ux_mode?: 'popup' | 'redirect';
}

interface GsiButtonOptions {
  type?: 'standard' | 'icon';
  size?: 'small' | 'medium' | 'large';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill';
  width?: number;
}

@Component({
  selector: 'app-login',
  template: `
    <div class="login-wrap">
      <div class="card">
        <h1>buhosly</h1>
        <p class="sub">Sign in with your Synacy or Rise Google account.</p>
        <div #gsiButton class="gsi-btn"></div>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        @if (loading()) {
          <p class="muted">Signing you in…</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 1.5rem;
        background: var(--rise-header-bg);
        background-attachment: fixed;
      }
      .card {
        background: var(--rise-card);
        padding: 2.5rem 2.5rem 2.25rem;
        border-radius: 18px;
        width: 380px;
        max-width: 100%;
        box-shadow: 0 30px 60px rgba(0, 0, 44, 0.4);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.1rem;
        border: 1px solid var(--rise-line);
      }
      h1 {
        margin: 0;
        color: var(--rise-pink);
        letter-spacing: 0.04em;
        font-weight: 700;
      }
      .sub {
        margin: 0;
        color: var(--rise-muted);
        text-align: center;
      }
      .gsi-btn {
        min-height: 44px;
      }
      .error {
        color: var(--rise-error);
        font-size: 0.9rem;
        margin: 0;
        text-align: center;
      }
      .muted {
        color: var(--rise-muted);
        font-size: 0.9rem;
        margin: 0;
      }
    `,
  ],
})
export class LoginPage implements AfterViewInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);

  @ViewChild('gsiButton', { static: true }) private buttonHost!: ElementRef<HTMLElement>;

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  ngAfterViewInit(): void {
    this.waitForGsi(() => this.initGoogle());
  }

  private waitForGsi(onReady: () => void, attempts = 0): void {
    if (window.google?.accounts?.id) {
      onReady();
      return;
    }
    if (attempts > 100) {
      this.error.set(
        'Google Sign-In failed to load. Check your network connection or ad blocker.'
      );
      return;
    }
    setTimeout(() => this.waitForGsi(onReady, attempts + 1), 100);
  }

  private initGoogle(): void {
    window.google!.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response) => this.zone.run(() => this.onCredential(response.credential)),
    });
    window.google!.accounts.id.renderButton(this.buttonHost.nativeElement, {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: 280,
    });
  }

  private onCredential(idToken: string): void {
    this.error.set(null);
    this.loading.set(true);
    this.auth.loginWithGoogle(idToken).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/feed');
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message ?? 'sign-in failed');
      },
    });
  }
}
