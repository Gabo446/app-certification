import { Timestamp } from '@angular/fire/firestore';

// Enum para roles de usuario
export enum UserRole {
  ADMIN = 'admin',
  CLIENTE = 'cliente',
  MODERADOR = 'moderador'
}

// Interface para usuario
export interface Usuario {
  id?: string;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string | null;

  // Información personal
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  fechaNacimiento: Timestamp | Date;

  // Información del sistema
  role: UserRole | string;
  isActive: boolean;
  profileCompleted: boolean;

  // Timestamps
  createdAt: Timestamp | Date;
  lastLoginAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;

  // Campos opcionales adicionales
  address?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  preferences?: UserPreferences;
  permissions?: string[];
}

// Interface para preferencias de usuario
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy?: {
    profileVisible: boolean;
    activityVisible: boolean;
  };
}

// Interface para filtros de búsqueda
export interface UserFilters {
  searchTerm: string;
  role: string;
  status: string;
  dateFrom?: Date;
  dateTo?: Date;
  region?: string;
}

// Interface para paginación
export interface PaginationOptions {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

// Interface para ordenamiento
export interface SortOptions {
  field: keyof Usuario;
  direction: 'asc' | 'desc';
}

// Interface para estadísticas de usuarios
export interface UserStats {
  total: number;
  active: number;
  inactive: number;
  byRole: {
    [key in UserRole]: number;
  };
  newThisMonth: number;
  lastLoginToday: number;
}

// Interface para formulario de creación de usuario
export interface CreateUserForm {
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  fechaNacimiento: string;
  password: string;
  role: UserRole | string;
  isActive: boolean;
}

// Interface para formulario de edición de usuario
export interface EditUserForm {
  email: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  fechaNacimiento: string;
  role: UserRole | string;
  isActive: boolean;
}

// Interface para respuesta de la API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Interface para operaciones CRUD
export interface CrudOperations<T> {
  create(item: Partial<T>): Promise<T>;
  read(id: string): Promise<T | null>;
  update(id: string, item: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
  list(filters?: any): Promise<T[]>;
}

// Type guards para validación de tipos
export function isUsuario(obj: any): obj is Usuario {
  return obj &&
    typeof obj.uid === 'string' &&
    typeof obj.email === 'string' &&
    typeof obj.nombres === 'string' &&
    typeof obj.apellidoPaterno === 'string' &&
    typeof obj.apellidoMaterno === 'string' &&
    typeof obj.rut === 'string' &&
    typeof obj.role === 'string' &&
    typeof obj.isActive === 'boolean';
}

export function isUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

// Utilidades para trabajar con usuarios
export class UserUtils {
  static getFullName(usuario: Usuario): string {
    return `${usuario.nombres} ${usuario.apellidoPaterno} ${usuario.apellidoMaterno}`.trim();
  }

  static getInitials(usuario: Usuario): string {
    const nombres = usuario.nombres?.charAt(0)?.toUpperCase() || '';
    const apellido = usuario.apellidoPaterno?.charAt(0)?.toUpperCase() || '';
    return `${nombres}${apellido}`;
  }

  static getRoleDisplayName(role: string): string {
    const roleNames: { [key: string]: string } = {
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.CLIENTE]: 'Cliente',
      [UserRole.MODERADOR]: 'Moderador'
    };
    return roleNames[role] || role;
  }

  static isAdult(fechaNacimiento: Date | Timestamp): boolean {
    const birthDate = fechaNacimiento instanceof Date
      ? fechaNacimiento
      : fechaNacimiento.toDate();

    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= 18;
    }

    return age >= 18;
  }

  static formatRut(rut: string): string {
    const cleanRut = rut.replace(/[^0-9kK]/g, '');

    if (cleanRut.length <= 1) return cleanRut;

    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formattedBody}-${dv}`;
  }

  static validateRut(rut: string): boolean {
    if (!rut) return false;

    const cleanRut = rut.replace(/[^0-9kK]/g, '');

    if (cleanRut.length < 8 || cleanRut.length > 9) return false;

    const body = cleanRut.slice(0, -1);
    const dv = cleanRut.slice(-1).toUpperCase();

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += parseInt(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = sum % 11;
    const calculatedDv = remainder === 0 ? '0' : remainder === 1 ? 'K' : (11 - remainder).toString();

    return dv === calculatedDv;
  }

  static formatDate(date: Date | Timestamp | string): string {
    let dateObj: Date;

    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date.toDate();
    }

    return dateObj.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  static calculateAge(fechaNacimiento: Date | Timestamp): number {
    const birthDate = fechaNacimiento instanceof Date
      ? fechaNacimiento
      : fechaNacimiento.toDate();

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }
}

// Constantes
export const USER_ROLES = Object.values(UserRole);

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'auto',
  language: 'es-CL',
  notifications: {
    email: true,
    push: true,
    sms: false
  },
  privacy: {
    profileVisible: true,
    activityVisible: false
  }
};

export const PAGINATION_DEFAULTS: PaginationOptions = {
  page: 1,
  limit: 10,
  totalItems: 0,
  totalPages: 0
};

export const SORT_DEFAULTS: SortOptions = {
  field: 'createdAt',
  direction: 'desc'
};
