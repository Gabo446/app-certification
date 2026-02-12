import { Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Observable, from, ObservedValueOf } from 'rxjs';
import { HttpsCallableResult } from 'firebase/functions';
import { collection, collectionData, Firestore, orderBy, query } from '@angular/fire/firestore';
import { UserDto } from '../models/user.dto';

export interface UpdateUserData {
  uid: string;
  email?: string;
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  rut?: string;
  fechaNacimiento?: string;
  role?: string;
  isActive?: boolean;
}

export interface UserAdminResponse {
  success: boolean;
  message: string;
  emailUpdated?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserAdminService {
  sortField = 'createdAt';
  sortDirection = 'desc';

  constructor(
    private functions: Functions,
    private firestore: Firestore
  ) {}


  getAllUsers(): Observable<UserDto[]> {
    const usuariosRef = collection(this.firestore, 'usuarios');
    const usuariosQuery = query(
      usuariosRef,
      orderBy(this.sortField, this.sortDirection as any)
    );

    return collectionData(usuariosQuery, { idField: 'id' }) as Observable<UserDto[]>;
  }


  updateUser(userData: UpdateUserData): Observable<ObservedValueOf<Promise<HttpsCallableResult<UserAdminResponse>>>> {
    const actualizarUsuario = httpsCallable<UpdateUserData, UserAdminResponse>(
      this.functions,
      'actualizarUsuarioAdmin'
    );

    return from(actualizarUsuario(userData));
  }

  deleteUser(uid: string): Observable<ObservedValueOf<Promise<HttpsCallableResult<UserAdminResponse>>>> {
    const eliminarUsuario = httpsCallable<{uid: string}, UserAdminResponse>(
      this.functions,
      'eliminarUsuarioAdmin'
    );

    return from(eliminarUsuario({ uid }));
  }

  completeProfile(profileData: {
    fechaNacimiento: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    rut: string;
  }): Observable<ObservedValueOf<Promise<HttpsCallableResult<unknown>>>> {
    const completarPerfil = httpsCallable(this.functions, 'completarPerfilUsuario');
    return from(completarPerfil(profileData));
  }
}
