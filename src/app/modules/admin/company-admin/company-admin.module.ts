import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularSvgIconModule } from 'angular-svg-icon';

// Routing
import { CompanyAdminRoutingModule } from './company-admin-routing.module';

// Components
import { CompanyAdminComponent } from './company-admin.component';

// Shared Components
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FooterComponent } from '../../layout/components/footer/footer.component';
import { NavbarComponent } from '../../layout/components/navbar/navbar.component';
import { SidebarComponent } from '../../layout/components/sidebar/sidebar.component';

// Firebase
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAuth, getAuth } from '@angular/fire/auth';

@NgModule({
  declarations: [
    // If you prefer to use declarations instead of standalone imports
    // CompanyAdminComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AngularSvgIconModule,
    CompanyAdminRoutingModule,

    // Standalone Components (if you're using them)
    CompanyAdminComponent,
    ButtonComponent,
    FooterComponent,
    NavbarComponent,
    SidebarComponent
  ],
  providers: [
    // Module-specific services if needed
  ]
})
export class CompanyAdminModule { }
