import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: '',
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    loadComponent: () => import('./modules/layout/layout.component').then((m) => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./modules/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'components',
        loadChildren: () => import('./modules/uikit/uikit.routes').then((m) => m.UIKIT_ROUTES),
      },
      {
        path: 'users-admin',
        loadComponent: () =>
          import('./modules/admin/users-admin/users-admin.component').then((m) => m.UsersAdminComponent),
      },
      {
        path: 'profile-admin',
        loadComponent: () =>
          import('./modules/admin/profile-admin/profile-admin.component').then((m) => m.ProfileAdminComponent),
      },
      {
        path: 'companyDto-admin',
        loadComponent: () =>
          import('./modules/admin/company-admin/company-admin.component').then((m) => m.CompanyAdminComponent),
      },
      {
        path: 'd-manager',
        loadComponent: () =>
          import('./modules/document-management/d-manager/d-manager.component').then((m) => m.DManagerComponent),
      },
      {
        path: 'document-manager',
        loadComponent: () =>
          import('./modules/document-management/document-manager/document-manager.component').then(
            (m) => m.DocumentManagerComponent,
          ),
      },
    ],
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    canActivateChild: [noAuthGuard],
    loadChildren: () => import('./modules/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'errors',
    loadChildren: () => import('./modules/error/error.routes').then((m) => m.ERROR_ROUTES),
  },
  { path: '**', redirectTo: 'errors/404' },
];
