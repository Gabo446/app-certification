import { Routes } from '@angular/router';

export const D_MANAGER_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./d-manager.component').then((m) => m.DManagerComponent) },
];
