import { Routes } from '@angular/router';

export const USERS_ADMIN_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./users-admin.component').then((m) => m.UsersAdminComponent) },
];
