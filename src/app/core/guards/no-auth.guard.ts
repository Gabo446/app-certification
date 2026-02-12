import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { authState, Auth } from '@angular/fire/auth';

export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    map((user) => (user ? router.createUrlTree(['/dashboard']) : true)),
  );
};
