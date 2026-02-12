import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from '../../../shared/components/button/button.component';
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
  orderBy,
  addDoc
} from '@angular/fire/firestore';
import { ProfileDto } from '../../../shared/models/profile.dto';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-profile-admin',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AngularSvgIconModule,
    ButtonComponent
  ],
  templateUrl: './profile-admin.component.html',
  styleUrl: './profile-admin.component.css',
})
export class ProfileAdminComponent implements OnInit {
  profiles$: Observable<ProfileDto[]> | undefined;
  profilesFiltered$ = new BehaviorSubject<ProfileDto[]>([]);

  // Forms
  profileForm!: FormGroup;
  editForm!: FormGroup;

  // Component states
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  isLoading = false;
  isCreating = false;
  isUpdating = false;
  isDeleting = false;

  // Selected profile
  selectedProfile: ProfileDto | null = null;

  // Filters and search
  searchTerm = '';
  departmentFilter = '';
  organizationFilter = '';
  statusFilter = '';

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalProfiles = 0;

  // Sorting
  sortField = 'createdAt';
  sortDirection = 'desc';

  // Department options (you can expand this list)
  departments = [
    'Human Resources',
    'Information Technology',
    'Finance',
    'Marketing',
    'Sales',
    'Operations',
    'Customer Service',
    'Research and Development',
    'Legal',
    'Administration'
  ];

  constructor(
    private readonly _formBuilder: FormBuilder,
    private firestore: Firestore
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadProfiles();
  }

  initializeForms(): void {
    // Form for creating profile
    this.profileForm = this._formBuilder.group({
      jobTitle: ['', [Validators.required, Validators.minLength(2)]],
      department: ['', [Validators.required]],
      managerName: ['', [Validators.required, Validators.minLength(2)]],
      organization: ['', [Validators.required, Validators.minLength(2)]],
      isActive: [true]
    });

    // Form for editing profile
    this.editForm = this._formBuilder.group({
      jobTitle: ['', [Validators.required, Validators.minLength(2)]],
      department: ['', [Validators.required]],
      managerName: ['', [Validators.required, Validators.minLength(2)]],
      organization: ['', [Validators.required, Validators.minLength(2)]],
      isActive: [true]
    });
  }

  loadProfiles(): void {
    this.isLoading = true;
    const profilesRef = collection(this.firestore, 'profiles');
    const profilesQuery = query(
      profilesRef,
      orderBy(this.sortField, this.sortDirection as any)
    );

    this.profiles$ = collectionData(profilesQuery, { idField: 'id' }) as Observable<ProfileDto[]>;

    this.profiles$.subscribe(profiles => {
      this.totalProfiles = profiles.length;
      this.applyFilters(profiles);
      this.isLoading = false;
    });
  }

  applyFilters(profiles: ProfileDto[]): void {
    let filteredProfiles = profiles;

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filteredProfiles = filteredProfiles.filter(profile =>
        profile.jobTitle.toLowerCase().includes(term) ||
        profile.department.toLowerCase().includes(term) ||
        profile.managerName.toLowerCase().includes(term) ||
        profile.organization.toLowerCase().includes(term)
      );
    }

    // Department filter
    if (this.departmentFilter) {
      filteredProfiles = filteredProfiles.filter(profile =>
        profile.department === this.departmentFilter
      );
    }

    // Organization filter
    if (this.organizationFilter) {
      filteredProfiles = filteredProfiles.filter(profile =>
        profile.organization.toLowerCase().includes(this.organizationFilter.toLowerCase())
      );
    }

    // Status filter
    if (this.statusFilter !== '') {
      const isActive = this.statusFilter === 'true';
      filteredProfiles = filteredProfiles.filter(profile => profile.isActive === isActive);
    }

    this.profilesFiltered$.next(filteredProfiles);
  }

  onSearchChange(): void {
    if (this.profiles$) {
      this.profiles$.subscribe(profiles => {
        this.applyFilters(profiles);
      });
    }
  }

  onFilterChange(): void {
    this.onSearchChange();
  }

  // CRUD Operations
  async createProfile(): Promise<void> {
    if (this.profileForm.invalid) return;

    this.isCreating = true;
    try {
      const formData = this.profileForm.value;
      const profilesRef = collection(this.firestore, 'profiles');

      const profileData: Omit<ProfileDto, 'id'> = {
        jobTitle: formData.jobTitle.trim(),
        department: formData.department,
        managerName: formData.managerName.trim(),
        organization: formData.organization.trim(),
        isActive: formData.isActive,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await addDoc(profilesRef, profileData);

      this.closeCreateModal();
      this.profileForm.reset();
      toast.success('Perfil creado exitosamente');
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast.error(error.message || 'Error desconocido');
    } finally {
      this.isCreating = false;
    }
  }

  async updateProfile(): Promise<void> {
    if (this.editForm.invalid || !this.selectedProfile?.id) return;

    this.isUpdating = true;
    try {
      const formData = this.editForm.value;
      const profileDocRef = doc(this.firestore, 'profiles', this.selectedProfile.id);

      const updateData: Partial<ProfileDto> = {
        jobTitle: formData.jobTitle.trim(),
        department: formData.department,
        managerName: formData.managerName.trim(),
        organization: formData.organization.trim(),
        isActive: formData.isActive,
        updatedAt: Timestamp.now()
      };

      await updateDoc(profileDocRef, updateData);

      this.closeEditModal();
      toast.success('Perfil actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Error desconocido');
    } finally {
      this.isUpdating = false;
    }
  }

  async deleteProfile(): Promise<void> {
    if (!this.selectedProfile?.id) return;

    this.isDeleting = true;
    try {
      const profileDocRef = doc(this.firestore, 'profiles', this.selectedProfile.id);
      await deleteDoc(profileDocRef);

      this.closeDeleteModal();
      toast.success('Perfil eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting profile:', error);
      toast.error(error.message || 'Error desconocido');
    } finally {
      this.isDeleting = false;
    }
  }

  // Modal methods
  openCreateModal(): void {
    this.showCreateModal = true;
    this.profileForm.reset();
    this.profileForm.patchValue({
      isActive: true
    });
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.profileForm.reset();
  }

  openEditModal(profile: ProfileDto): void {
    this.selectedProfile = profile;
    this.showEditModal = true;

    this.editForm.patchValue({
      jobTitle: profile.jobTitle,
      department: profile.department,
      managerName: profile.managerName,
      organization: profile.organization,
      isActive: profile.isActive
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedProfile = null;
    this.editForm.reset();
  }

  openDeleteModal(profile: ProfileDto): void {
    this.selectedProfile = profile;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedProfile = null;
  }

  // Form getters
  get createFormControls() {
    return this.profileForm.controls;
  }

  get editFormControls() {
    return this.editForm.controls;
  }

  // Utility methods
  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-CL');
  }

  getDepartmentDisplayName(department: string): string {
    return department;
  }

  // Pagination
  get paginatedProfiles(): ProfileDto[] {
    const profiles = this.profilesFiltered$.value;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return profiles.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.profilesFiltered$.value.length / this.itemsPerPage);
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
}
