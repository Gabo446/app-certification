import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
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
  orderBy,
  addDoc
} from '@angular/fire/firestore';
import { companyDto } from '../models/company.dto';


@Injectable({
  providedIn: 'root'
})
export class CompaniesService {
  private readonly collectionName = 'companies';

  constructor(private firestore: Firestore) {}

  /**
   * Get all profiles
   */
  getCompanies(): Observable<companyDto[]> {
    const profilesRef = collection(this.firestore, this.collectionName);
    const profilesQuery = query(profilesRef, orderBy('createdAt', 'desc'));
    return collectionData(profilesQuery, { idField: 'id' }) as Observable<companyDto[]>;
  }

}
