// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { Observable, from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { authState, Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(private auth: Auth, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.check();
  }

  canActivateChild(): Observable<boolean | UrlTree> {
    return this.check();
  }

  private check(): Observable<boolean | UrlTree> {
    return from(this.auth.authStateReady()).pipe(
      switchMap(() => authState(this.auth).pipe(take(1))),
      map((user) => (user ? true : this.router.createUrlTree(['/auth/sign-in']))),
    );
  }
}
