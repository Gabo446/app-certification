import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, from, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  Timestamp,
  QueryConstraint
} from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword, deleteUser } from '@angular/fire/auth';
import {
  Usuario,
  UserFilters,
  PaginationOptions,
  SortOptions,
  UserStats,
  CreateUserForm,
  EditUserForm,
  ApiResponse,
  UserUtils
} from '../models/user.types';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersCollection = collection(this.firestore, 'usuarios');
  private usersSubject = new BehaviorSubject<Usuario[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  // Observables públicos
  public users$ = this.usersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {
    this.loadUsers();
  }

  /**
   * Carga todos los usuarios
   */
  private loadUsers(): void {
    this.loadingSubject.next(true);

    const usersQuery = query(
      this.usersCollection,
      orderBy('createdAt', 'desc')
    );

    collectionData(usersQuery, { idField: 'id' }).subscribe({
      next: (users: any[]) => {
        this.usersSubject.next(users as Usuario[]);
        this.loadingSubject.next(false);
        this.errorSubject.next(null);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loadingSubject.next(false);
        this.errorSubject.next('Error al cargar usuarios');
      }
    });
  }

  /**
   * Obtiene usuarios con filtros y paginación
   */
  getUsers(
    filters?: UserFilters,
    pagination?: PaginationOptions,
    sort?: SortOptions
  ): Observable<Usuario[]> {
    const constraints: QueryConstraint[] = [];

    // Aplicar filtros
    if (filters?.role) {
      constraints.push(where('role', '==', filters.role));
    }

    if (filters?.status !== '') {
      const isActive = filters?.status === 'true';
      constraints.push(where('isActive', '==', isActive));
    }

    // Aplicar ordenamiento
    if (sort?.field && sort?.direction) {
      constraints.push(orderBy(sort.field, sort.direction));
    }

    // Aplicar paginación
    if (pagination?.limit) {
      constraints.push(limit(pagination.limit));
    }

    const usersQuery = query(this.usersCollection, ...constraints);

    return collectionData(usersQuery, { idField: 'id' }).pipe(
      map((users: any[]) => {
        let filteredUsers = users as Usuario[];

        // Filtro por término de búsqueda (se hace en cliente por limitaciones de Firestore)
        if (filters?.searchTerm) {
          const term = filters.searchTerm.toLowerCase();
          filteredUsers = filteredUsers.filter(user =>
            user.nombres.toLowerCase().includes(term) ||
            user.apellidoPaterno.toLowerCase().includes(term) ||
            user.apellidoMaterno.toLowerCase().includes(term) ||
            user.email.toLowerCase().includes(term) ||
            user.rut.includes(term)
          );
        }

        return filteredUsers;
      }),
      catchError(error => {
        console.error('Error getting users:', error);
        this.errorSubject.next('Error al obtener usuarios');
        return of([]);
      })
    );
  }

  /**
   * Obtiene un usuario por ID
   */
  getUserById(id: string): Observable<Usuario | null> {
    const userDoc = doc(this.firestore, 'usuarios', id);

    return from(getDoc(userDoc)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() } as Usuario;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting user:', error);
        this.errorSubject.next('Error al obtener usuario');
        return of(null);
      })
    );
  }

  /**
   * Crea un nuevo usuario
   */
  async createUser(userData: CreateUserForm): Promise<ApiResponse<Usuario>> {
    try {
      this.loadingSubject.next(true);

      // Verificar si el RUT ya existe
      const rutExists = await this.checkRutExists(userData.rut);
      if (rutExists) {
        return {
          success: false,
          error: 'El RUT ya está registrado'
        };
      }

      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        userData.email,
        userData.password
      );

      // Crear documento en Firestore
      const newUser: Omit<Usuario, 'id'> = {
        uid: userCredential.user.uid,
        email: userData.email,
        nombres: userData.nombres.trim(),
        apellidoPaterno: userData.apellidoPaterno.trim(),
        apellidoMaterno: userData.apellidoMaterno.trim(),
        rut: userData.rut.trim(),
        fechaNacimiento: Timestamp.fromDate(new Date(userData.fechaNacimiento)),
        role: userData.role,
        isActive: userData.isActive,
        profileCompleted: true,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now()
      };

      const userDoc = doc(this.firestore, 'usuarios', userCredential.user.uid);
      await setDoc(userDoc, newUser);

      const createdUser: Usuario = { id: userCredential.user.uid, ...newUser };

      // Actualizar la lista local
      const currentUsers = this.usersSubject.value;
      this.usersSubject.next([createdUser, ...currentUsers]);

      this.loadingSubject.next(false);

      return {
        success: true,
        data: createdUser,
        message: 'Usuario creado exitosamente'
      };

    } catch (error: any) {
      console.error('Error creating user:', error);
      this.loadingSubject.next(false);

      return {
        success: false,
        error: this.getErrorMessage(error)
      };
    }
  }

  /**
   * Actualiza un usuario existente
   */
  async updateUser(id: string, userData: EditUserForm): Promise<ApiResponse<Usuario>> {
    try {
      this.loadingSubject.next(true);

      const userDoc = doc(this.firestore, 'usuarios', id);

      const updateData = {
        email: userData.email,
        nombres: userData.nombres.trim(),
        apellidoPaterno: userData.apellidoPaterno.trim(),
        apellidoMaterno: userData.apellidoMaterno.trim(),
        rut: userData.rut.trim(),
        fechaNacimiento: Timestamp.fromDate(new Date(userData.fechaNacimiento)),
        role: userData.role,
        isActive: userData.isActive,
        updatedAt: Timestamp.now()
      };

      await updateDoc(userDoc, updateData);

      // Actualizar la lista local
      const currentUsers = this.usersSubject.value;
      const updatedUsers = currentUsers.map(user =>
        user.id === id ? { ...user, ...updateData } : user
      );
      this.usersSubject.next(updatedUsers);

      this.loadingSubject.next(false);

      const updatedUser = updatedUsers.find(user => user.id === id);

      return {
        success: true,
        data: updatedUser,
        message: 'Usuario actualizado exitosamente'
      };

    } catch (error: any) {
      console.error('Error updating user:', error);
      this.loadingSubject.next(false);

      return {
        success: false,
        error: 'Error al actualizar usuario'
      };
    }
  }

  /**
   * Elimina un usuario
   */
  async deleteUser(id: string): Promise<ApiResponse<boolean>> {
    try {
      this.loadingSubject.next(true);

      const userDoc = doc(this.firestore, 'usuarios', id);
      await deleteDoc(userDoc);

      // Actualizar la lista local
      const currentUsers = this.usersSubject.value;
      const filteredUsers = currentUsers.filter(user => user.id !== id);
      this.usersSubject.next(filteredUsers);

      this.loadingSubject.next(false);

      return {
        success: true,
        data: true,
        message: 'Usuario eliminado exitosamente'
      };

    } catch (error: any) {
      console.error('Error deleting user:', error);
      this.loadingSubject.next(false);

      return {
        success: false,
        error: 'Error al eliminar usuario'
      };
    }
  }

  /**
   * Verifica si un RUT ya existe
   */
  async checkRutExists(rut: string): Promise<boolean> {
    try {
      const rutQuery = query(
        this.usersCollection,
        where('rut', '==', rut.trim())
      );

      const querySnapshot = await getDocs(rutQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking RUT:', error);
      return false;
    }
  }

  /**
   * Verifica si un email ya existe
   */
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const emailQuery = query(
        this.usersCollection,
        where('email', '==', email.toLowerCase())
      );

      const querySnapshot = await getDocs(emailQuery);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking email:', error);
      return false;
    }
  }

  /**
   * Obtiene estadísticas de usuarios
   */
  getUserStats(): Observable<UserStats> {
    return this.users$.pipe(
      map(users => {
        const total = users.length;
        const active = users.filter(u => u.isActive).length;
        const inactive = total - active;

        const byRole = users.reduce((acc, user) => {
          acc[user.role as keyof typeof acc] = (acc[user.role as keyof typeof acc] || 0) + 1;
          return acc;
        }, { admin: 0, cliente: 0, moderador: 0 });

        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const newThisMonth = users.filter(user => {
          const createdAt = user.createdAt instanceof Timestamp
            ? user.createdAt.toDate()
            : new Date(user.createdAt);
          return createdAt >= thisMonth;
        }).length;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastLoginToday = users.filter(user => {
          if (!user.lastLoginAt) return false;
          const lastLogin = user.lastLoginAt instanceof Timestamp
            ? user.lastLoginAt.toDate()
            : new Date(user.lastLoginAt);
          return lastLogin >= today;
        }).length;

        return {
          total,
          active,
          inactive,
          byRole,
          newThisMonth,
          lastLoginToday
        };
      })
    );
  }

  /**
   * Busca usuarios por término
   */
  searchUsers(term: string): Observable<Usuario[]> {
    return this.users$.pipe(
      map(users => {
        if (!term.trim()) return users;

        const searchTerm = term.toLowerCase();
        return users.filter(user =>
          user.nombres.toLowerCase().includes(searchTerm) ||
          user.apellidoPaterno.toLowerCase().includes(searchTerm) ||
          user.apellidoMaterno.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.rut.includes(searchTerm) ||
          UserUtils.getFullName(user).toLowerCase().includes(searchTerm)
        );
      })
    );
  }

  /**
   * Filtra usuarios por rol
   */
  filterUsersByRole(role: string): Observable<Usuario[]> {
    return this.users$.pipe(
      map(users => role ? users.filter(user => user.role === role) : users)
    );
  }

  /**
   * Filtra usuarios por estado
   */
  filterUsersByStatus(isActive: boolean | null): Observable<Usuario[]> {
    return this.users$.pipe(
      map(users =>
        isActive !== null
          ? users.filter(user => user.isActive === isActive)
          : users
      )
    );
  }

  /**
   * Obtiene usuarios con paginación
   */
  getPaginatedUsers(page: number, limit: number): Observable<{ users: Usuario[], total: number }> {
    return this.users$.pipe(
      map(users => {
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;

        return {
          users: users.slice(startIndex, endIndex),
          total: users.length
        };
      })
    );
  }

  /**
   * Refresca la lista de usuarios
   */
  refreshUsers(): void {
    this.loadUsers();
  }

  /**
   * Obtiene mensaje de error amigable
   */
  private getErrorMessage(error: any): string {
    if (error.code) {
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'El correo electrónico ya está en uso';
        case 'auth/weak-password':
          return 'La contraseña es muy débil';
        case 'auth/invalid-email':
          return 'El correo electrónico no es válido';
        case 'permission-denied':
          return 'No tienes permisos para realizar esta acción';
        case 'unavailable':
          return 'Servicio no disponible temporalmente';
        case 'not-found':
          return 'Usuario no encontrado';
        default:
          return error.message || 'Error desconocido';
      }
    }
    return error.message || 'Error desconocido';
  }

  /**
   * Limpia los errores
   */
  clearError(): void {
    this.errorSubject.next(null);
  }

  /**
   * Exporta usuarios a CSV
   */
  exportUsersToCSV(users: Usuario[]): string {
    const headers = [
      'ID',
      'Email',
      'Nombres',
      'Apellido Paterno',
      'Apellido Materno',
      'RUT',
      'Fecha Nacimiento',
      'Rol',
      'Estado',
      'Fecha Registro'
    ];

    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.id || '',
        user.email,
        user.nombres,
        user.apellidoPaterno,
        user.apellidoMaterno,
        user.rut,
        UserUtils.formatDate(user.fechaNacimiento),
        UserUtils.getRoleDisplayName(user.role),
        user.isActive ? 'Activo' : 'Inactivo',
        UserUtils.formatDate(user.createdAt)
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Valida los datos del usuario
   */
  validateUserData(userData: CreateUserForm | EditUserForm): string[] {
    const errors: string[] = [];

    // Validar email
    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Email inválido');
    }

    // Validar nombres
    if (!userData.nombres || userData.nombres.trim().length < 2) {
      errors.push('Los nombres deben tener al menos 2 caracteres');
    }

    // Validar apellidos
    if (!userData.apellidoPaterno || userData.apellidoPaterno.trim().length < 2) {
      errors.push('El apellido paterno debe tener al menos 2 caracteres');
    }

    if (!userData.apellidoMaterno || userData.apellidoMaterno.trim().length < 2) {
      errors.push('El apellido materno debe tener al menos 2 caracteres');
    }

    // Validar RUT
    if (!userData.rut || !UserUtils.validateRut(userData.rut)) {
      errors.push('RUT inválido');
    }

    // Validar fecha de nacimiento
    if (!userData.fechaNacimiento) {
      errors.push('Fecha de nacimiento requerida');
    } else {
      const birthDate = new Date(userData.fechaNacimiento);
      if (!UserUtils.isAdult(birthDate)) {
        errors.push('El usuario debe ser mayor de 18 años');
      }
    }

    // Validar contraseña (solo para creación)
    if ('password' in userData) {
      if (!userData.password || userData.password.length < 8) {
        errors.push('La contraseña debe tener al menos 8 caracteres');
      }
    }

    return errors;
  }

  /**
   * Obtiene usuarios por rol
   */
  getUsersByRole(role: string): Observable<Usuario[]> {
    const roleQuery = query(
      this.usersCollection,
      where('role', '==', role),
      orderBy('createdAt', 'desc')
    );

    return collectionData(roleQuery, { idField: 'id' }).pipe(
      map(users => users as Usuario[]),
      catchError(error => {
        console.error('Error getting users by role:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene usuarios activos
   */
  getActiveUsers(): Observable<Usuario[]> {
    const activeQuery = query(
      this.usersCollection,
      where('isActive', '==', true),
      orderBy('lastLoginAt', 'desc')
    );

    return collectionData(activeQuery, { idField: 'id' }).pipe(
      map(users => users as Usuario[]),
      catchError(error => {
        console.error('Error getting active users:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene usuarios recientes
   */
  getRecentUsers(limit: number = 10): Observable<Usuario[]> {
    const recentQuery = query(
      this.usersCollection,
      orderBy('createdAt', 'desc'),
      // limit(limit) // Descomenta si quieres limitar desde Firestore
    );

    return collectionData(recentQuery, { idField: 'id' }).pipe(
      map(users => (users as Usuario[]).slice(0, limit)),
      catchError(error => {
        console.error('Error getting recent users:', error);
        return of([]);
      })
    );
  }

  /**
   * Actualiza el último login de un usuario
   */
  async updateLastLogin(userId: string): Promise<void> {
    try {
      const userDoc = doc(this.firestore, 'usuarios', userId);
      await updateDoc(userDoc, {
        lastLoginAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Activa o desactiva un usuario
   */
  async toggleUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<boolean>> {
    try {
      const userDoc = doc(this.firestore, 'usuarios', userId);
      await updateDoc(userDoc, {
        isActive,
        updatedAt: Timestamp.now()
      });

      // Actualizar la lista local
      const currentUsers = this.usersSubject.value;
      const updatedUsers = currentUsers.map(user =>
        user.id === userId ? { ...user, isActive, updatedAt: Timestamp.now() } : user
      );
      this.usersSubject.next(updatedUsers);

      return {
        success: true,
        data: true,
        message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`
      };
    } catch (error) {
      console.error('Error toggling user status:', error);
      return {
        success: false,
        error: 'Error al cambiar el estado del usuario'
      };
    }
  }

  /**
   * Actualiza el rol de un usuario
   */
  async updateUserRole(userId: string, newRole: string): Promise<ApiResponse<boolean>> {
    try {
      const userDoc = doc(this.firestore, 'usuarios', userId);
      await updateDoc(userDoc, {
        role: newRole,
        updatedAt: Timestamp.now()
      });

      // Actualizar la lista local
      const currentUsers = this.usersSubject.value;
      const updatedUsers = currentUsers.map(user =>
        user.id === userId ? { ...user, role: newRole, updatedAt: Timestamp.now() } : user
      );
      this.usersSubject.next(updatedUsers);

      return {
        success: true,
        data: true,
        message: 'Rol actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error updating user role:', error);
      return {
        success: false,
        error: 'Error al actualizar el rol del usuario'
      };
    }
  }

  /**
   * Busca usuarios con criterios avanzados
   */
  advancedSearch(criteria: {
    name?: string;
    email?: string;
    rut?: string;
    role?: string;
    isActive?: boolean;
    createdAfter?: Date;
    createdBefore?: Date;
  }): Observable<Usuario[]> {
    return this.users$.pipe(
      map(users => {
        return users.filter(user => {
          // Filtro por nombre
          if (criteria.name) {
            const fullName = UserUtils.getFullName(user).toLowerCase();
            if (!fullName.includes(criteria.name.toLowerCase())) {
              return false;
            }
          }

          // Filtro por email
          if (criteria.email) {
            if (!user.email.toLowerCase().includes(criteria.email.toLowerCase())) {
              return false;
            }
          }

          // Filtro por RUT
          if (criteria.rut) {
            if (!user.rut.includes(criteria.rut)) {
              return false;
            }
          }

          // Filtro por rol
          if (criteria.role) {
            if (user.role !== criteria.role) {
              return false;
            }
          }

          // Filtro por estado
          if (criteria.isActive !== undefined) {
            if (user.isActive !== criteria.isActive) {
              return false;
            }
          }

          // Filtro por fecha de creación
          if (criteria.createdAfter || criteria.createdBefore) {
            const createdAt = user.createdAt instanceof Timestamp
              ? user.createdAt.toDate()
              : new Date(user.createdAt);

            if (criteria.createdAfter && createdAt < criteria.createdAfter) {
              return false;
            }

            if (criteria.createdBefore && createdAt > criteria.createdBefore) {
              return false;
            }
          }

          return true;
        });
      })
    );
  }

  /**
   * Obtiene el estado del servicio
   */
  getServiceStatus(): { loading: boolean; error: string | null; usersCount: number } {
    return {
      loading: this.loadingSubject.value,
      error: this.errorSubject.value,
      usersCount: this.usersSubject.value.length
    };
  }
}
