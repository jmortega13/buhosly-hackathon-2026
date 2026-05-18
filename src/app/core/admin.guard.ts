import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    router.navigateByUrl('/login');
    return false;
  }
  if (auth.currentUser()?.isAdmin) return true;
  router.navigateByUrl('/feed');
  return false;
};
