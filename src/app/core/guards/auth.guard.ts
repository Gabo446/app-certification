// auth.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { authState } from '@angular/fire/auth';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      map((user) => {
        console.log('AuthGuard - currentUser:', user);
        if (user) {
          return true;
        } else {
          return this.router.createUrlTree(['/auth/login']);
        }
      }),
    );
  }
}
