import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';



// Shared Components
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FooterComponent } from '../../layout/components/footer/footer.component';
import { NavbarComponent } from '../../layout/components/navbar/navbar.component';
import { SidebarComponent } from '../../layout/components/sidebar/sidebar.component';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { DManagerRoutingModule } from './d-manager-routing.module';
import { DManagerComponent } from './d-manager.component';

@NgModule({
  declarations: [
    // Si prefieres usar declarations en lugar de imports standalone
    // ProfileAdminComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AngularSvgIconModule,
    DManagerRoutingModule,
    // Standalone Components (si los estás usando)
    DManagerComponent,
    ButtonComponent,
    FooterComponent,
    NavbarComponent,
    SidebarComponent
  ],
  providers: [
    // Servicios específicos del módulo si los necesitas
  ]
})
export class DManagerModule { }
