import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { FooterComponent } from '../../layout/components/footer/footer.component';
import { NavbarComponent } from '../../layout/components/navbar/navbar.component';
import { SidebarComponent } from '../../layout/components/sidebar/sidebar.component';
import { AuthService } from '../../../core/guards/auth.service';
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
import { UpdateUserData, UserAdminService } from '../../../shared/services/usersService';
import { ProfileService } from '../../../shared/services/profileService';
import { CompaniesService } from '../../../shared/services/companyService';
import { companyDto } from '../../../shared/models/company.dto';
import { UserDto } from '../../../shared/models/user.dto';

interface Usuario {
  id?: string;
  uid: string;
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  fechaNacimiento: any;
  role: string;
  isActive: boolean;
  createdAt: any;
  lastLoginAt: any;
  profileCompleted: boolean;
}

interface Profile {
  id?: string;
  jobTitle: string;
  department: string;
  managerName: string;
  organization: string;
  userId?: string; // Optional reference to user
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}


@Component({
  selector: 'app-users-admin',
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
  templateUrl: './users-admin.component.html',
  styleUrl: './users-admin.component.css',
})
export class UsersAdminComponent implements OnInit {
  usuarios$: Observable<UserDto[]> | undefined;
  profiles$: Observable<Profile[]> | undefined;
  companies$: Observable<companyDto[]> | undefined;
  profiles: Profile[] | undefined;
  companies: companyDto[] | undefined;
  usuariosFiltrados$ = new BehaviorSubject<UserDto[]>([]);

  // Formularios
  userForm!: FormGroup;
  editForm!: FormGroup;

  // Estados del componente
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  isLoading = false;
  isCreating = false;
  isUpdating = false;
  isDeleting = false;

  // Usuario seleccionado
  selectedUser: UserDto | null = null;

  // Filtros y búsqueda
  searchTerm = '';
  roleFilter = '';
  statusFilter = '';

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalUsers = 0;

  constructor(
    private authService: AuthService,
    private readonly _formBuilder: FormBuilder,
    private firestore: Firestore,
    private userAdminService: UserAdminService,
    private profileService: ProfileService,
    private companiesService: CompaniesService,
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadUsers();
    this.loadProfiles();
    this.loadCompanies();
  }

  initializeForms(): void {
    // Formulario para crear usuario
    this.userForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.required, Validators.minLength(2)]],
      rut: ['', [Validators.required, this.rutValidator]],
      fechaNacimiento: ['', [Validators.required, this.ageValidator]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      profile: ['', Validators.required],
      company: ['', Validators.required],
      isActive: [true]
    });

    // Formulario para editar usuario
    this.editForm = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.required, Validators.minLength(2)]],
      rut: ['', [Validators.required, this.rutValidator]],
      fechaNacimiento: ['', [Validators.required, this.ageValidator]],
      profile: [ Validators.required],
      company: [ Validators.required],
      isActive: [true]
    });
  }

  loadProfiles(): void {
    this.isLoading = true;
    this.profiles$ = this.profileService.getProfiles();

    this.profiles$.subscribe(Profiles => {
      this.profiles = Profiles;
      this.isLoading = false;
    });
  }

  loadCompanies(): void {
    this.isLoading = true;
    this.companies$ = this.companiesService.getCompanies();

    this.companies$.subscribe(Profiles => {
      this.companies = Profiles;
      console.log(this.companies);
      this.isLoading = false;
    });
  }

  loadUsers(): void {
    this.isLoading = true;
    this.usuarios$ = this.userAdminService.getAllUsers();

    this.usuarios$.subscribe(usuarios => {
      this.totalUsers = usuarios.length;
      console.log(usuarios);
      this.applyFilters(usuarios);
      this.isLoading = false;
    });
  }

  applyFilters(usuarios: UserDto[]): void {
    let filteredUsers = usuarios;

    // Filtro por término de búsqueda
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.nombres.toLowerCase().includes(term) ||
        user.apellidoPaterno.toLowerCase().includes(term) ||
        user.apellidoMaterno.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.rut.includes(term)
      );
    }

/*    // Filtro por rol
    if (this.roleFilter) {
      filteredUsers = filteredUsers.filter(user => user.role === this.roleFilter);
    }*/

    // Filtro por estado
    if (this.statusFilter !== '') {
      const isActive = this.statusFilter === 'true';
      filteredUsers = filteredUsers.filter(user => user.isActive === isActive);
    }

    this.usuariosFiltrados$.next(filteredUsers);
  }

  onSearchChange(): void {
    if (this.usuarios$) {
      this.usuarios$.subscribe(usuarios => {
        this.applyFilters(usuarios);
      });
    }
  }

  onFilterChange(): void {
    this.onSearchChange();
  }

  // Validadores
  rutValidator(control: AbstractControl): { [key: string]: any } | null {
    const rut = control.value;
    if (!rut) return null;

    const rutLimpio = rut.replace(/[^0-9kK]/g, '');

    if (rutLimpio.length < 8 || rutLimpio.length > 9) {
      return { invalidRut: true };
    }

    const cuerpo = rutLimpio.slice(0, -1);
    const digitoVerificador = rutLimpio.slice(-1).toUpperCase();

    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = suma % 11;
    const digitoCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();

    return digitoVerificador === digitoCalculado ? null : { invalidRut: true };
  }

  ageValidator(control: AbstractControl): { [key: string]: any } | null {
    const fechaNacimiento = control.value;
    if (!fechaNacimiento) return null;

    const today = new Date();
    const birthDate = new Date(fechaNacimiento);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age < 18 ? { invalidAge: true } : null;
    }

    return age < 18 ? { invalidAge: true } : null;
  }

  // Operaciones CRUD
  async createUser(): Promise<void> {
    if (this.userForm.invalid) return;

    this.isCreating = true;
    try {
      const formData = this.userForm.value;
      console.log(formData);
      // Verificar si el RUT ya existe
      const rutExists = await this.checkRutExists(formData.rut);
      if (rutExists) {
        alert('Error: El RUT ya está registrado');
        return;
      }

      // Crear usuario en Firebase Auth
      const userCredential = await this.authService.register(formData.email, formData.password);

      if (userCredential.user) {
        // Crear documento en Firestore
        await this.createUserDocument(userCredential.user, formData);

        this.closeCreateModal();
        this.userForm.reset();
        alert('Usuario creado exitosamente');
      }
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      alert(`Error: ${this.getErrorMessage(error)}`);
    } finally {
      this.isCreating = false;
    }
  }

  // MÉTODO ACTUALIZADO: Usar Firebase Functions para actualizar usuario
  async updateUser(): Promise<void> {
    if (this.editForm.invalid || !this.selectedUser) return;

    this.isUpdating = true;
    try {
      const formData = this.editForm.value;

      // Preparar datos para la función de Firebase
      const updateData = {
        uid: this.selectedUser.uid,
        email: formData.email,
        nombres: formData.nombres.trim(),
        apellidoPaterno: formData.apellidoPaterno.trim(),
        apellidoMaterno: formData.apellidoMaterno.trim(),
        rut: formData.rut.trim(),
        fechaNacimiento: formData.fechaNacimiento,
        profile: formData.profile,
        company: formData.company,
        isActive: formData.isActive
      };

      // Usar el servicio para actualizar (esto sincroniza Auth y Firestore)
      this.userAdminService.updateUser(updateData).subscribe({
        next: (response) => {
          console.log('Usuario actualizado:', response);
          this.closeEditModal();

          if (response.data.emailUpdated) {
            alert('Usuario actualizado exitosamente. El email también se actualizó en Firebase Auth.');
          } else {
            alert('Usuario actualizado exitosamente');
          }
        },
        error: (error) => {
          console.error('Error al actualizar usuario:', error);

          // Manejar errores específicos
          let errorMessage = 'Error al actualizar usuario';
          if (error.code === 'functions/already-exists') {
            errorMessage = error.message;
          } else if (error.code === 'functions/invalid-argument') {
            errorMessage = error.message;
          } else if (error.code === 'functions/permission-denied') {
            errorMessage = 'No tienes permisos para actualizar usuarios';
          }

          alert(errorMessage);
        }
      });

    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      alert('Error al actualizar usuario');
    } finally {
      this.isUpdating = false;
    }
  }

  // MÉTODO ACTUALIZADO: Usar Firebase Functions para eliminar usuario
  async deleteUser(): Promise<void> {
    if (!this.selectedUser) return;

    this.isDeleting = true;
    try {
      // Usar el servicio para eliminar (esto elimina de Auth y Firestore)
      this.userAdminService.deleteUser(this.selectedUser.uid).subscribe({
        next: (response) => {
          console.log('Usuario eliminado:', response);
          this.closeDeleteModal();
          alert('Usuario eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error al eliminar usuario:', error);

          let errorMessage = 'Error al eliminar usuario';
          if (error.code === 'functions/permission-denied') {
            errorMessage = 'No tienes permisos para eliminar usuarios';
          } else if (error.code === 'functions/not-found') {
            errorMessage = 'Usuario no encontrado';
          } else if (error.code === 'functions/invalid-argument') {
            errorMessage = error.message;
          }

          alert(errorMessage);
        }
      });

    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      alert('Error al eliminar usuario');
    } finally {
      this.isDeleting = false;
    }
  }


  // Métodos auxiliares
  async checkRutExists(rut: string): Promise<boolean> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      const q = query(usuariosRef, where('rut', '==', rut));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error verificando RUT:', error);
      return false;
    }
  }

  async createUserDocument(user: any, additionalData: any): Promise<void> {
    const userDocRef = doc(this.firestore, 'usuarios', user.uid);
    const userData: UserDto = {
      uid: user.uid,
      email: user.email || '',
      createdAt: Timestamp.now(),
      lastLoginAt: Timestamp.now(),
      profile: additionalData.profile,
      company: additionalData.company,
      isActive: additionalData.isActive ?? true,
      phoneNumber: user.phoneNumber || null,
      fechaNacimiento: Timestamp.fromDate(new Date(additionalData.fechaNacimiento)),
      nombres: additionalData.nombres.trim(),
      apellidoPaterno: additionalData.apellidoPaterno.trim(),
      apellidoMaterno: additionalData.apellidoMaterno.trim(),
      rut: additionalData.rut.trim(),
      profileCompleted: true
    };
    console.log(userData);

    await setDoc(userDocRef, userData);
  }

  getErrorMessage(error: any): string {
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'El correo electrónico ya está en uso';
        case 'auth/weak-password':
          return 'La contraseña es muy débil';
        case 'auth/invalid-email':
          return 'El correo electrónico no es válido';
        default:
          return error.message || 'Error desconocido';
      }
    }
    return 'Error desconocido';
  }

  formatRut(event: any, formGroup: FormGroup): void {
    let rut = event.target.value.replace(/[^0-9kK]/g, '');

    if (rut.length > 1) {
      const cuerpo = rut.slice(0, -1);
      const dv = rut.slice(-1);
      const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      rut = `${cuerpoFormateado}-${dv}`;
    }

    formGroup.get('rut')?.setValue(rut, { emitEvent: false });
  }

  // Métodos para modales
  openCreateModal(): void {
    this.showCreateModal = true;
    this.userForm.reset();
    this.userForm.patchValue({
      isActive: true
    });
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.userForm.reset();
  }

  openEditModal(user: UserDto): void {
    this.selectedUser = user;
    this.showEditModal = true;

    // Convertir Timestamp a string para el input date
    const fechaNacimiento = user.fechaNacimiento?.toDate?.() || new Date(user.fechaNacimiento.toDate());

    this.editForm.patchValue({
      email: user.email,
      nombres: user.nombres,
      apellidoPaterno: user.apellidoPaterno,
      apellidoMaterno: user.apellidoMaterno,
      rut: user.rut,
      fechaNacimiento: fechaNacimiento.toISOString().split('T')[0],
      profile: user.profile,
      company: user.company,
      isActive: user.isActive
    });
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedUser = null;
    this.editForm.reset();
  }

  openDeleteModal(user: UserDto): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedUser = null;
  }

  // Getters para formularios
  get createFormControls() {
    return this.userForm.controls;
  }

  get editFormControls() {
    return this.editForm.controls;
  }

  // Métodos de utilidad
  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('es-CL');
  }

  getFullName(user: UserDto): string {
    return `${user.nombres} ${user.apellidoPaterno} ${user.apellidoMaterno}`;
  }

  getRoleDisplayName(role: string): string {
    const roles: { [key: string]: string } = {
      'admin': 'Administrador',
      'cliente': 'Cliente',
      'moderador': 'Moderador'
    };
    return roles[role] || role;
  }

  toggleUserStatus(user: UserDto): void {
    this.selectedUser = user;
    this.updateUser();
  }

  // Paginación
  get paginatedUsers(): UserDto[] {
    const users = this.usuariosFiltrados$.value;
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return users.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.usuariosFiltrados$.value.length / this.itemsPerPage);
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
