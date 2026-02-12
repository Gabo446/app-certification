import { Routes } from '@angular/router';

export const PROFILE_ADMIN_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./profile-admin.component').then((m) => m.ProfileAdminComponent) },
];
