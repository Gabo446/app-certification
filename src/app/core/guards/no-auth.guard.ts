// no-auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { authState } from '@angular/fire/auth';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class NoAuthGuard implements CanActivate, CanActivateChild {
  constructor(private auth: Auth, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return this.check();
  }

  canActivateChild(): Observable<boolean | UrlTree> {
    return this.check();
  }

  private check(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      map((user) => {
        if (user) {
          return this.router.createUrlTree(['/dashboard']);
        } else {
          return true;
        }
      }),
    );
  }
}
