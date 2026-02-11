import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { NoAuthGuard } from './core/guards/no-auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'auth',
    pathMatch: 'full',
  },
  {
    path: '',
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    loadChildren: () => import('./modules/layout/layout.module').then(m => m.LayoutModule),
  },
  {
    path: 'users-admin',
    canActivate: [AuthGuard],
    loadComponent: () => import('./modules/admin/users-admin/users-admin.component').then((m) => m.UsersAdminComponent),
  },
  {
    path: 'profile-admin',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./modules/admin/profile-admin/profile-admin.component').then((m) => m.ProfileAdminComponent),
  },
  {
    path: 'companyDto-admin',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./modules/admin/company-admin/company-admin.component').then((m) => m.CompanyAdminComponent),
  },
  {
    path: 'd-manager',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./modules/document-management/d-manager/d-manager.component').then((m) => m.DManagerComponent),
  },
  {
    path: 'document-manager',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./modules/document-management/document-manager/document-manager.component').then(
        (m) => m.DocumentManagerComponent,
      ),
  },
  {
    path: 'auth',
    canActivate: [NoAuthGuard],
    canActivateChild: [NoAuthGuard],
    loadChildren: () => import('./modules/auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'errors',
    loadChildren: () => import('./modules/error/error.module').then((m) => m.ErrorModule),
  },
  { path: '**', redirectTo: 'errors/404' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
