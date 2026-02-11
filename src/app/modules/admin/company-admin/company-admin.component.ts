import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FooterComponent } from '../../layout/components/footer/footer.component';
import { NavbarComponent } from '../../layout/components/navbar/navbar.component';
import { SidebarComponent } from '../../layout/components/sidebar/sidebar.component';
import { Observable, BehaviorSubject } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy
} from '@angular/fire/firestore';

interface Company {
  id?: string;
  businessName: string;
  tradeName: string;
  rut: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  businessSector: string;
  businessType: string; // SPA, LTDA, SA, etc.
  website?: string;
  description?: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
  employeeCount: number;
  annualRevenue?: number;
  foundedYear?: number;
  taxId: string; // RUT formatted for tax purposes
}

@Component({
  selector: 'app-companyDto-admin',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AngularSvgIconModule,
    ButtonComponent,
    SidebarComponent,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './company-admin.component.html',
  styleUrl: './company-admin.component.css',
})
export class CompanyAdminComponent implements OnInit {
  companies$: Observable<Company[]> | undefined;
  companiesFiltered$ = new BehaviorSubject<Company[]>([]);

  // Forms
  companyForm!: FormGroup;
  editForm!: FormGroup;

  // Component states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  isLoading = false;
  isCreating = false;
  isUpdating = false;
  isDeleting = false;

  // Selected companyDto
  selectedCompany: Company | null = null;

  // Filters and search
  searchTerm = '';
  sectorFilter = '';
  statusFilter = '';
  typeFilter = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalCompanies = 0;

  // Sorting
  sortField = 'createdAt';
  sortDirection = 'desc';

  // Business sectors options
  businessSectors = [
    'Tecnología',
    'Retail',
    'Manufactura',
    'Servicios Financieros',
    'Salud',
    'Educación',
    'Construcción',
    'Agricultura',
    'Minería',
    'Transporte',
    'Turismo',
    'Alimentaria',
    'Textil',
    'Energía',
    'Telecomunicaciones',
    'Inmobiliario',
    'Consultoría',
    'Otro'
  ];

  // Business types options
  businessTypes = [
    'SPA', // Sociedad por Acciones
    'LTDA', // Sociedad de Responsabilidad Limitada
    'SA', // Sociedad Anónima
    'EIRL', // Empresa Individual de Responsabilidad Limitada
    'Persona Natural',
    'Cooperativa',
    'Fundación',
    'Corporación'
  ];

  // Chilean regions
  regions = [
    'Arica y Parinacota',
    'Tarapacá',
    'Antofagasta',
    'Atacama',
    'Coquimbo',
    'Valparaíso',
    'Metropolitana de Santiago',
    'Libertador General Bernardo O\'Higgins',
    'Maule',
    'Ñuble',
    'Biobío',
    'La Araucanía',
    'Los Ríos',
    'Los Lagos',
    'Aysén del General Carlos Ibáñez del Campo',
    'Magallanes y de la Antártica Chilena'
  ];

  now = new Date();

  constructor(
    private readonly formBuilder: FormBuilder,
    private firestore: Firestore
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadCompanies();
  }

  initializeForms(): void {
    // Create companyDto form
    this.companyForm = this.formBuilder.group({
      businessName: ['', [Validators.required, Validators.minLength(2)]],
      tradeName: ['', [Validators.required, Validators.minLength(2)]],
      rut: ['', [Validators.required, this.rutValidator]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(8)]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      region: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      businessSector: ['', [Validators.required]],
      businessType: ['', [Validators.required]],
      website: [''],
      description: [''],
      employeeCount: [1, [Validators.required, Validators.min(1)]],
      annualRevenue: [0, [Validators.min(0)]],
      foundedYear: ['', [this.yearValidator]],
      isActive: [true]
    });

    // Edit companyDto form
    this.editForm = this.formBuilder.group({
      businessName: ['', [Validators.required, Validators.minLength(2)]],
      tradeName: ['', [Validators.required, Validators.minLength(2)]],
      rut: ['', [Validators.required, this.rutValidator]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.minLength(8)]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      region: ['', [Validators.required]],
      postalCode: ['', [Validators.required]],
      businessSector: ['', [Validators.required]],
      businessType: ['', [Validators.required]],
      website: [''],
      description: [''],
      employeeCount: [1, [Validators.required, Validators.min(1)]],
      annualRevenue: [0, [Validators.min(0)]],
      foundedYear: ['', [this.yearValidator]],
      isActive: [true]
    });
  }

  loadCompanies(): void {
    this.isLoading = true;
    const companiesRef = collection(this.firestore, 'companies');
    const companiesQuery = query(
      companiesRef,
      orderBy(this.sortField, this.sortDirection as any)
    );

    this.companies$ = collectionData(companiesQuery, { idField: 'id' }) as Observable<Company[]>;

    this.companies$.subscribe(companies => {
      this.totalCompanies = companies.length;
      this.applyFilters(companies);
      this.isLoading = false;
    });
  }

  applyFilters(companies: Company[]): void {
    let filteredCompanies = companies;

    // Search term filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filteredCompanies = filteredCompanies.filter(company =>
        company.businessName.toLowerCase().includes(term) ||
        company.tradeName.toLowerCase().includes(term) ||
        company.email.toLowerCase().includes(term) ||
        company.rut.includes(term) ||
        company.city.toLowerCase().includes(term)
      );
    }

    // Sector filter
    if (this.sectorFilter) {
      filteredCompanies = filteredCompanies.filter(company =>
        company.businessSector === this.sectorFilter
      );
    }

    // Status filter
    if (this.statusFilter !== '') {
      const isActive = this.statusFilter === 'true';
      filteredCompanies = filteredCompanies.filter(company =>
        company.isActive === isActive
      );
    }

    // Type filter
    if (this.typeFilter) {
      filteredCompanies = filteredCompanies.filter(company =>
        company.businessType === this.typeFilter
      );
    }

    this.companiesFiltered$.next(filteredCompanies);
  }

  onSearchChange(): void {
    if (this.companies$) {
      this.companies$.subscribe(companies => {
        this.applyFilters(companies);
      });
    }
  }

  onFilterChange(): void {
    this.onSearchChange();
  }

  // Validators
  rutValidator(control: AbstractControl): { [key: string]: any } | null {
    const rut = control.value;
    if (!rut) return null;

    const rutClean = rut.replace(/[^0-9kK]/g, '');

    if (rutClean.length < 8 || rutClean.length > 9) {
      return { invalidRut: true };
    }

    const body = rutClean.slice(0, -1);
    const checkDigit = rutClean.slice(-1).toUpperCase();

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const calculatedDigit = remainder === 0 ? '0' : remainder === 1 ? 'K' : (11 - remainder).toString();

    return checkDigit === calculatedDigit ? null : { invalidRut: true };
  }

  yearValidator(control: AbstractControl): { [key: string]: any } | null {
    const year = control.value;
    if (!year) return null;

    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(year);

    if (yearNum < 1800 || yearNum > currentYear) {
      return { invalidYear: true };
    }

    return null;
  }

  // CRUD Operations
  async createCompany(): Promise<void> {
    if (this.companyForm.invalid) return;

    this.isCreating = true;
    try {
      const formData = this.companyForm.value;

      // Check if RUT already exists
      const rutExists = await this.checkRutExists(formData.rut);
      if (rutExists) {
        alert('Error: El RUT ya está registrado');
        return;
      }

      // Generate companyDto ID
      const companyId = doc(collection(this.firestore, 'companies')).id;

      // Create companyDto document
      const companyData: Company = {
        id: companyId,
        businessName: formData.businessName.trim(),
        tradeName: formData.tradeName.trim(),
        rut: formData.rut.trim(),
        taxId: this.formatRutForTax(formData.rut),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        region: formData.region,
        postalCode: formData.postalCode.trim(),
        businessSector: formData.businessSector,
        businessType: formData.businessType,
        website: formData.website?.trim() || '',
        description: formData.description?.trim() || '',
        employeeCount: formData.employeeCount,
        annualRevenue: formData.annualRevenue || 0,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
        isActive: formData.isActive,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      const companyDocRef = doc(this.firestore, 'companies', companyId);
      await setDoc(companyDocRef, companyData);

      this.closeCreateModal();
      this.companyForm.reset();
      alert('Empresa creada exitosamente');

    } catch (error: any) {
      console.error('Error creating companyDto:', error);
      alert(`Error: ${this.getErrorMessage(error)}`);
    } finally {
      this.isCreating = false;
    }
  }

  async updateCompany(): Promise<void> {
    if (this.editForm.invalid || !this.selectedCompany) return;

    this.isUpdating = true;
    try {
      const formData = this.editForm.value;

      // Check if RUT exists for another companyDto
      if (formData.rut !== this.selectedCompany.rut) {
        const rutExists = await this.checkRutExists(formData.rut, this.selectedCompany.id);
        if (rutExists) {
          alert('Error: El RUT ya está registrado por otra empresa');
          return;
        }
      }

      const updateData = {
        businessName: formData.businessName.trim(),
        tradeName: formData.tradeName.trim(),
        rut: formData.rut.trim(),
        taxId: this.formatRutForTax(formData.rut),
        email: formData.email.toLowerCase().trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        region: formData.region,
        postalCode: formData.postalCode.trim(),
        businessSector: formData.businessSector,
        businessType: formData.businessType,
        website: formData.website?.trim() || '',
        description: formData.description?.trim() || '',
        employeeCount: formData.employeeCount,
        annualRevenue: formData.annualRevenue || 0,
        foundedYear: formData.foundedYear ? parseInt(formData.foundedYear) : undefined,
        isActive: formData.isActive,
        updatedAt: Timestamp.now()
      };

      const companyDocRef = doc(this.firestore, 'companies', this.selectedCompany.id!);
      await updateDoc(companyDocRef, updateData);

      this.closeEditModal();
      alert('Empresa actualizada exitosamente');

    } catch (error: any) {
      console.error('Error updating companyDto:', error);
      alert(`Error: ${this.getErrorMessage(error)}`);
    } finally {
      this.isUpdating = false;
    }
  }

  async deleteCompany(): Promise<void> {
    if (!this.selectedCompany) return;

    this.isDeleting = true;
    try {
      const companyDocRef = doc(this.firestore, 'companies', this.selectedCompany.id!);
      await deleteDoc(companyDocRef);

      this.closeDeleteModal();
      alert('Empresa eliminada exitosamente');

    } catch (error: any) {
      console.error('Error deleting companyDto:', error);
      alert(`Error: ${this.getErrorMessage(error)}`);
    } finally {
      this.isDeleting = false;
    }
  }

  // Helper methods
  async checkRutExists(rut: string, excludeId?: string): Promise<boolean> {
    try {
      const companiesRef = collection(this.firestore, 'companies');
      const q = query(companiesRef, where('rut', '==', rut));
      const querySnapshot = await getDocs(q);

      if (excludeId) {
        return querySnapshot.docs.some(doc => doc.id !== excludeId);
      }

      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking RUT:', error);
      return false;
    }
  }

  getErrorMessage(error: any): string {
    return error.message || 'Error desconocido';
  }

  formatRut(event: any, formGroup: FormGroup): void {
    let rut = event.target.value.replace(/[^0-9kK]/g, '');

    if (rut.length > 1) {
      const body = rut.slice(0, -1);
      const dv = rut.slice(-1);
      const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      rut = `${formattedBody}-${dv}`;
    }

    formGroup.get('rut')?.setValue(rut, { emitEvent: false });
  }

  formatRutForTax(rut: string): string {
    return rut.replace(/[^0-9kK]/g, '');
  }

  // Modal methods
  openCreateModal(): void {
    this.showCreateModal = true;
    this.companyForm.reset();
    this.companyForm.patchValue({
      businessType: '',
      businessSector: '',
      region: '',
      isActive: true,
      employeeCount: 1,
      annualRevenue: 0
    });
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.companyForm.reset();
  }

  openEditModal(company: Company): void {
    this.selectedCompany = company;
    this.showEditModal = true;

    this.editForm.patchValue({
      businessName: company.businessName,
      tradeName: company.tradeName,
      rut: company.rut,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      region: company.region,
      postalCode: company.postalCode,
      businessSector: company.businessSector,
      businessType: company.businessType,
      website: company.website || '',
      description: company.description || '',
      employeeCount: company.employeeCount,
      annualRevenue: company.annualRevenue || 0,
      foundedYear: company.foundedYear?.toString() || '',
      isActive: company.isActive
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedCompany = null;
    this.editForm.reset();
  }

  openDeleteModal(company: Company): void {
    this.selectedCompany = company;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedCompany = null;
  }

  // Utility methods
  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-CL');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount);
  }

  formatEmployeeCount(count: number): string {
    if (count === 1) return '1 empleado';
    return `${count} empleados`;
  }

  // Pagination
  get paginatedCompanies(): Company[] {
    const companies = this.companiesFiltered$.value;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return companies.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.companiesFiltered$.value.length / this.itemsPerPage);
  }

  changePage(page: number): void {
    this.currentPage = page;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  protected readonly Math = Math;
  protected readonly Date = Date;
}
