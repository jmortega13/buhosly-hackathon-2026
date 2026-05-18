import { Routes } from '@angular/router';

import { adminGuard } from './core/admin.guard';
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
  {
    path: 'admin/users',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-users/admin-users').then((m) => m.AdminUsersPage),
  },
  {
    path: 'admin/rewards',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-rewards/admin-rewards').then((m) => m.AdminRewardsPage),
  },
  {
    path: 'admin/redemptions',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin-redemptions/admin-redemptions').then((m) => m.AdminRedemptionsPage),
  },
  { path: 'admin', redirectTo: 'admin/users', pathMatch: 'full' },
  { path: '**', redirectTo: 'feed' },
];
