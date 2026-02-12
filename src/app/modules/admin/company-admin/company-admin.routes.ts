import { Routes } from '@angular/router';

export const COMPANY_ADMIN_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./company-admin.component').then((m) => m.CompanyAdminComponent) },
];
