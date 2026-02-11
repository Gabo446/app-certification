import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  user,
  User,
  UserCredential
} from '@angular/fire/auth';
import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  createdAt: any;
  lastLoginAt: any;
  role: string;
  isActive: boolean;
  phoneNumber: string | null;
  fechaNacimiento: any;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  profileCompleted: boolean;
  updatedAt?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<User | null>;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    this.user$ = user(this.auth);
  }

  // Registro de usuario (solo Auth, sin crear documento)
  async register(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      console.log('Usuario creado en Auth:', userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  // Inicio de sesión
  async login(email: string, password: string): Promise<void> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);

      // Actualizar lastLoginAt en Firestore si el documento existe
      try {
        const userDocRef = doc(this.firestore, 'usuarios', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          await updateDoc(userDocRef, {
            lastLoginAt: Timestamp.now()
          });
        }
      } catch (firestoreError) {
        console.log('No se pudo actualizar lastLoginAt:', firestoreError);
      }

      console.log('Usuario autenticado:', userCredential.user.uid);
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  // Cerrar sesión
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/auth/sign-in']);
    } catch (error) {
      console.error('Error en logout:', error);
      throw error;
    }
  }

  // Obtener perfil del usuario actual
  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return null;
    }

    try {
      const userDocRef = doc(this.firestore, 'usuarios', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }
  }

  // Verificar si el RUT ya existe
  async checkRutExists(rut: string, excludeUid?: string): Promise<boolean> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      let q = query(usuariosRef, where('rut', '==', rut));

      if (excludeUid) {
        // Para futuras actualizaciones, excluir el UID actual
        q = query(usuariosRef, where('rut', '==', rut), where('uid', '!=', excludeUid));
      }

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error verificando RUT:', error);
      return false;
    }
  }

  // Verificar si el email ya existe en Firestore
  async checkEmailExists(email: string, excludeUid?: string): Promise<boolean> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      let q = query(usuariosRef, where('email', '==', email));

      if (excludeUid) {
        q = query(usuariosRef, where('email', '==', email), where('uid', '!=', excludeUid));
      }

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error verificando email:', error);
      return false;
    }
  }

  // Actualizar perfil del usuario
  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    try {
      const userDocRef = doc(this.firestore, 'usuarios', uid);
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  // Obtener usuario actual
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  // Verificar si el perfil está completo
  async isProfileComplete(): Promise<boolean> {
    const profile = await this.getCurrentUserProfile();
    return profile?.profileCompleted || false;
  }
}
