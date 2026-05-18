import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'feed' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'feed',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/feed/feed').then((m) => m.FeedPage),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage),
  },
  {
    path: 'rewards',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/rewards/rewards').then((m) => m.RewardsPage),
  },
  {
    path: 'redemptions',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/redemptions/redemptions').then((m) => m.RedemptionsPage),
  },
  { path: '**', redirectTo: 'feed' },
];
