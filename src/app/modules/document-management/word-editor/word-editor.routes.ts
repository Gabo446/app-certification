import { Routes } from '@angular/router';

export const WORD_EDITOR_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./word-editor.component').then((m) => m.WordEditorComponent) },
];
