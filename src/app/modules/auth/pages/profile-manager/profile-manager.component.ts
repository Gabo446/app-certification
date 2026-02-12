import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { Firestore, collection, collectionData, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs, docData } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { ButtonComponent } from 'src/app/shared/components/button/button.component';
import { NgIf, NgFor, NgClass, AsyncPipe } from '@angular/common';
import { UserDto } from '../../../../shared/models/user.dto';
import { toast } from 'ngx-sonner';

@Component({
  selector: 'app-profile-manager',
  templateUrl: './profile-manager.component.html',
  styleUrls: ['./profile-manager.component.css'],
  imports: [NgIf, NgFor, NgClass, ReactiveFormsModule, ButtonComponent, AngularSvgIconModule, AsyncPipe],
  standalone: true,
})
export class ProfileManagerComponent implements OnInit {
  profiles$: Observable<any[]> = new Observable();
  profileForm!: FormGroup;
  editingId: string | null = null;
  isSubmitting = false;
  showForm = false;
  roles = [
    { value: 'cliente', label: 'Cliente' },
    { value: 'empresa', label: 'Empresa' },
    { value: 'administrador', label: 'Administrador' },
    { value: 'visor', label: 'Visor' },
    { value: 'revisor', label: 'Revisor' },
  ];
  filteredProfiles$: Observable<any[]> = new Observable();

  constructor(private fb: FormBuilder, private firestore: Firestore) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProfiles();
  }

  initForm() {
    this.profileForm = this.fb.group(
      {
        email: ['', [Validators.required, Validators.email]],
        nombres: ['', [Validators.required, Validators.minLength(2)]],
        apellidoPaterno: ['', [Validators.required, Validators.minLength(2)]],
        apellidoMaterno: ['', [Validators.required, Validators.minLength(2)]],
        rut: ['', [Validators.required, this.rutValidator]],
        fechaNacimiento: ['', [Validators.required, this.ageValidator]],
        role: ['cliente', Validators.required],
        isActive: [true],
        // Empresa fields
        empresa_nombre: [''],
        empresa_rut: ['', this.rutValidator],
        empresa_giro: [''],
        empresa_direccion: [''],
        empresa_telefono: [''],
        empresa_contactoNombre: [''],
        empresa_contactoEmail: [''],
      },
      { validators: this.conditionalEmpresaFields },
    );

    // Mostrar u ocultar campos de empresa según el rol
    this.profileForm.get('role')?.valueChanges.subscribe((role) => {
      this.toggleEmpresaFields(role);
    });
  }

  loadProfiles() {
    const coll = collection(this.firestore, 'usuarios');
    this.profiles$ = collectionData(coll, { idField: 'id' });
    this.filteredProfiles$ = this.profiles$;
  }

  filterByRole(role: string) {
    if (!role) {
      this.filteredProfiles$ = this.profiles$;
      return;
    }

    const coll = collection(this.firestore, 'usuarios');
    const q = query(coll, where('role', '==', role));
    this.filteredProfiles$ = collectionData(q, { idField: 'id' });
  }

  editProfile(id: string) {
    const docRef = doc(this.firestore, 'usuarios', id);
    docData(docRef).subscribe((user: UserDto) => {
      this.editingId = id;

      // Llenar formulario
      this.profileForm.patchValue({
        email: user.email,
        nombres: user.nombres,
        apellidoPaterno: user.apellidoPaterno,
        apellidoMaterno: user.apellidoMaterno,
        rut: user.rut,
        fechaNacimiento: user.fechaNacimiento?.toDate().toISOString().split('T')[0],
        role: user.role,
        isActive: user.isActive ?? true,
        empresa_nombre: user.empresa?.nombre || '',
        empresa_rut: user.empresa?.rut || '',
        empresa_giro: user.empresa?.giro || '',
        empresa_direccion: user.empresa?.direccion || '',
        empresa_telefono: user.empresa?.telefono || '',
        empresa_contactoNombre: user.empresa?.contactoNombre || '',
        empresa_contactoEmail: user.empresa?.contactoEmail || '',
      });

      this.toggleEmpresaFields(user.role);

      this.showForm = true;
    });
  }

  deleteProfile(id: string) {
    if (confirm('¿Estás seguro de eliminar este perfil?')) {
      deleteDoc(doc(this.firestore, 'usuarios', id))
        .then(() => {
          toast.success('Perfil eliminado');
        })
        .catch((err) => {
          console.error('Error al eliminar:', err);
          toast.error('No se pudo eliminar el perfil');
        });
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      toast.error('Formulario inválido');
      return;
    }

    this.isSubmitting = true;
    const formValues = this.profileForm.value;

    const userData = {
      email: formValues.email,
      nombres: formValues.nombres.trim(),
      apellidoPaterno: formValues.apellidoPaterno.trim(),
      apellidoMaterno: formValues.apellidoMaterno.trim(),
      rut: formValues.rut.replace(/\./g, '').toUpperCase(),
      fechaNacimiento: formValues.fechaNacimiento ? new Date(formValues.fechaNacimiento) : null,
      role: formValues.role,
      isActive: formValues.isActive,
      displayName: `${formValues.nombres} ${formValues.apellidoPaterno}`,
      updatedAt: Date.now(),
    };

    // Agregar datos de empresa si aplica
    if (formValues.role === 'empresa') {
      (userData as any).empresa = {
        nombre: formValues.empresa_nombre.trim(),
        rut: formValues.empresa_rut.replace(/\./g, '').toUpperCase(),
        giro: formValues.empresa_giro.trim(),
        direccion: formValues.empresa_direccion.trim(),
        telefono: formValues.empresa_telefono.trim(),
        contactoNombre: formValues.empresa_contactoNombre?.trim() || null,
        contactoEmail: formValues.empresa_contactoEmail?.trim() || null,
      };
    }

    const docRef = this.editingId
      ? doc(this.firestore, 'usuarios', this.editingId)
      : doc(collection(this.firestore, 'usuarios'));

    setDoc(docRef, userData, { merge: true })
      .then(() => {
        toast.success(`Perfil ${this.editingId ? 'actualizado' : 'creado'} correctamente`);
        this.cancelEdit();
        this.loadProfiles();
      })
      .catch((err) => {
        console.error('Error guardando perfil:', err);
        toast.error('Error al guardar');
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  }

  addNewProfile() {
    this.editingId = null;
    this.profileForm.reset({
      isActive: true,
      role: 'cliente',
    });
    this.toggleEmpresaFields('cliente');
    this.showForm = true;
  }

  cancelEdit() {
    this.showForm = false;
    this.editingId = null;
    this.profileForm.reset();
  }

  // Validadores personalizados
  rutValidator(control: AbstractControl): { [key: string]: any } | null {
    const rut = control.value;
    if (!rut) return null;

    const rutLimpio = rut.replace(/[^0-9kK]/g, '');
    if (rutLimpio.length < 8 || rutLimpio.length > 9) return { invalidRut: true };

    const cuerpo = rutLimpio.slice(0, -1);
    const dv = rutLimpio.slice(-1).toUpperCase();

    let suma = 0;
    let mult = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * mult;
      mult = mult === 7 ? 2 : mult + 1;
    }

    const resto = suma % 11;
    const dvEsperado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();
    return dv === dvEsperado ? null : { invalidRut: true };
  }

  ageValidator(control: AbstractControl): { [key: string]: any } | null {
    const date = control.value;
    if (!date) return null;

    const today = new Date();
    const birthDate = new Date(date);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age >= 18 ? null : { invalidAge: true };
  }

  conditionalEmpresaFields(group: FormGroup): { [key: string]: any } | null {
    const role = group.get('role')?.value;
    if (role !== 'empresa') return null;

    const requiredFields = ['empresa_nombre', 'empresa_rut', 'empresa_giro', 'empresa_direccion', 'empresa_telefono'];

    for (const field of requiredFields) {
      if (!group.get(field)?.value) {
        return { missingEmpresaFields: true };
      }
    }

    return null;
  }

  toggleEmpresaFields(role: string) {
    const empresaFields = [
      'empresa_nombre',
      'empresa_rut',
      'empresa_giro',
      'empresa_direccion',
      'empresa_telefono',
      'empresa_contactoNombre',
      'empresa_contactoEmail',
    ];

    empresaFields.forEach((field) => {
      const ctrl = this.profileForm.get(field);
      if (role === 'empresa') {
        ctrl?.setValidators([Validators.required]);
      } else {
        ctrl?.clearValidators();
      }
      ctrl?.updateValueAndValidity({ emitEvent: false });
    });
  }

  formatRut(event: any, field: string) {
    let rut = event.target.value.replace(/[^0-9kK]/g, '');

    if (rut.length > 1) {
      const cuerpo = rut.slice(0, -1);
      const dv = rut.slice(-1);
      const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      rut = `${cuerpoFormateado}-${dv}`;
    }

    this.profileForm.get(field)?.setValue(rut, { emitEvent: false });
  }
}
