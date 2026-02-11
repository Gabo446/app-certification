import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WordEditorComponent } from './word-editor.component';

const routes: Routes = [
  {
    path: '',
    component: WordEditorComponent,
    children: [
      // Rutas hijas aquí si las necesitas
      // { path: 'create', loadComponent: () => import('./create-user.component').then(m => m.CreateUserComponent) },
      // { path: 'edit/:id', loadComponent: () => import('./edit-user.component').then(m => m.EditUserComponent) }
    ]
  }
  // Puedes agregar rutas hijas aquí si las necesitas
  // {
  //   path: 'create',
  //   component: CreateUserComponent
  // },
  // {
  //   path: 'edit/:id',
  //   component: EditUserComponent
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class  WordEditorRoutingModule {}
