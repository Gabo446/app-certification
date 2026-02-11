import { Injectable, OnInit } from '@angular/core';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User, getAuth } from 'firebase/auth';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';


@Injectable({
  providedIn: 'root',
})
export class AuthService implements OnInit {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private router: Router, private auth: Auth) {
    // Escuchar cambios en el estado de autenticación
    onAuthStateChanged(auth, (user) => {
      //console.log('Estado de auth serv:', user);
    });
  }
  ngOnInit(): void {}

  login(email: string, password: string): Promise<any> {
    console.log('login')
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  register(email: string, password: string): Promise<any> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  // ✅ Método síncrono (solo si realmente lo necesitas, pero cuidado)
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated() {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(this.auth, (user) => {
        unsubscribe(); // Detener la escucha después de la primera emisión
        resolve(!!user);
      });
    });
  }
}
