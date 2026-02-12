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
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  role: string;
  isActive: boolean;
  phoneNumber: string | null;
  fechaNacimiento: Timestamp;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  rut: string;
  profileCompleted: boolean;
  updatedAt?: Timestamp;
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

  async register(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  async login(email: string, password: string): Promise<void> {
    const userCredential = await signInWithEmailAndPassword(this.auth, email, password);

    try {
      const userDocRef = doc(this.firestore, 'usuarios', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        await updateDoc(userDocRef, {
          lastLoginAt: Timestamp.now()
        });
      }
    } catch (firestoreError) {
      // Non-critical: lastLoginAt update can fail silently
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/auth/sign-in']);
  }

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

  async checkRutExists(rut: string, excludeUid?: string): Promise<boolean> {
    try {
      const usuariosRef = collection(this.firestore, 'usuarios');
      let q = query(usuariosRef, where('rut', '==', rut));

      if (excludeUid) {
        q = query(usuariosRef, where('rut', '==', rut), where('uid', '!=', excludeUid));
      }

      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error verificando RUT:', error);
      return false;
    }
  }

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

  async updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
    const userDocRef = doc(this.firestore, 'usuarios', uid);
    await updateDoc(userDocRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.auth.currentUser;
  }

  async isProfileComplete(): Promise<boolean> {
    const profile = await this.getCurrentUserProfile();
    return profile?.profileCompleted || false;
  }
}
