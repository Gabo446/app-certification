// Documento en 'usuarios/{uid}'
import { Timestamp } from '@angular/fire/firestore';
import { companyDto } from './company.dto';
import { ProfileDto } from './profile.dto';

export type UserDto = {
  uid: string,
  email: string,
  nombres: string,
  apellidoPaterno: string,
  apellidoMaterno: string,
  rut: string,
  fechaNacimiento: Timestamp,
  isActive: boolean,
  profileCompleted: boolean,
  createdAt: Timestamp,
  lastLoginAt: Timestamp,
  phoneNumber: string | null,
  company?: companyDto
  profile?: ProfileDto
}
