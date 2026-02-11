import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { AuthService } from '../../../../core/guards/auth.service';
import { NgClass, NgIf } from '@angular/common';
import { Observable } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  getDocs
} from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  imports: [FormsModule, RouterLink, AngularSvgIconModule, ButtonComponent, ReactiveFormsModule, NgClass, NgIf],
})
export class SignUpComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  passwordTextType = false;
  isRegistering = false;
  usuarios$: Observable<any[]> | undefined;

  constructor(
    private authService: AuthService,
    private readonly _formBuilder: FormBuilder,
    private firestore: Firestore,
    private auth: Auth,
    private functions: Functions
  ) {}

  ngOnInit(): void {
    this.form = this._formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      nombres: ['', [Validators.required, Validators.minLength(2)]],
      apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
      apellidoMaterno: ['', [Validators.required, Validators.minLength(2)]],
      rut: ['', [Validators.required, this.rutValidator]],
      fechaNacimiento: ['', [Validators.required, this.ageValidator]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: this.checkPasswords });

    // Opcional: Observar la colección de usuarios
    const usuariosRef = collection(this.firestore, 'usuarios');
    this.usuarios$ = collectionData(usuariosRef, { idField: 'id' });
  }

  // Validador personalizado para RUT
  rutValidator(control: AbstractControl): { [key: string]: any } | null {
    const rut = control.value;
    if (!rut) return null;

    // Limpiar el RUT
    const rutLimpio = rut.replace(/[^0-9kK]/g, '');

    if (rutLimpio.length < 8 || rutLimpio.length > 9) {
      return { invalidRut: true };
    }

    const cuerpo = rutLimpio.slice(0, -1);
    const digitoVerificador = rutLimpio.slice(-1).toUpperCase();

    // Calcular dígito verificador
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

  // Validador de edad mínima
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

  checkPasswords(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    return password === confirmPassword ? null : { notSame: true };
  }

  get f() {
    return this.form.controls;
  }

  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  // Formatear RUT mientras se escribe
  formatRut(event: any) {
    let rut = event.target.value.replace(/[^0-9kK]/g, '');

    if (rut.length > 1) {
      const cuerpo = rut.slice(0, -1);
      const dv = rut.slice(-1);

      // Agregar puntos cada 3 dígitos
      const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      rut = `${cuerpoFormateado}-${dv}`;
    }

    // Actualizar el valor del control
    this.form.get('rut')?.setValue(rut, { emitEvent: false });
  }

  // Verificar si el RUT ya existe (opcional - la función de Firebase también lo verifica)
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

  // Completar perfil usando Firebase Function
  async completarPerfil(profileData: any): Promise<any> {
    const completarPerfilFn = httpsCallable(this.functions, 'completarPerfilUsuario');

    try {
      const result = await completarPerfilFn(profileData);
      return result.data;
    } catch (error) {
      console.error('Error al completar perfil:', error);
      throw error;
    }
  }

  async register() {
    this.submitted = true;
    this.isRegistering = true;

    try {
      // Si el formulario no es válido, no continuar
      if (this.form.invalid) {
        this.isRegistering = false;
        return;
      }

      const formData = this.form.value;

      // Paso 1: Crear usuario en Firebase Auth
      const userCredential = await this.authService.register(formData.email, formData.password);

      // Esperar un momento para que se ejecute el trigger de createUsuarioDoc
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Paso 2: Completar perfil usando la función de Firebase
      const profileData = {
        fechaNacimiento: formData.fechaNacimiento,
        nombres: formData.nombres.trim(),
        apellidoPaterno: formData.apellidoPaterno.trim(),
        apellidoMaterno: formData.apellidoMaterno.trim(),
        rut: formData.rut.trim()
      };

      const result = await this.completarPerfil(profileData);

      if (result.success) {
        alert('Registro exitoso. Perfil completado correctamente.');
        // Aquí podrías redirigir al usuario a otra página
        // this.router.navigate(['/dashboard']);
      }

    } catch (error: any) {
      console.error('Error al registrar:', error);
      let errorMessage = 'Error desconocido';

      // Manejar errores de Firebase Auth
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = 'El correo electrónico ya está en uso';
            break;
          case 'auth/weak-password':
            errorMessage = 'La contraseña es muy débil';
            break;
          case 'auth/invalid-email':
            errorMessage = 'El correo electrónico no es válido';
            break;
          // Errores de Firebase Functions
          case 'functions/unauthenticated':
            errorMessage = 'Error de autenticación';
            break;
          case 'functions/invalid-argument':
            errorMessage = 'Datos inválidos proporcionados';
            break;
          case 'functions/already-exists':
            errorMessage = 'El RUT ya está registrado';
            break;
          default:
            errorMessage = error.message || 'Error en el registro';
        }
      }

      // Si hay un error específico del mensaje de la función
      if (error.details && error.details.message) {
        errorMessage = error.details.message;
      }

      alert(`Error: ${errorMessage}`);
    } finally {
      this.isRegistering = false;
    }
  }
}
