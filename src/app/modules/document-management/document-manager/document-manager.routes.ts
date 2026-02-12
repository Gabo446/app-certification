import { Routes } from '@angular/router';

export const DOCUMENT_MANAGER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./document-manager.component').then((m) => m.DocumentManagerComponent),
  },
];
