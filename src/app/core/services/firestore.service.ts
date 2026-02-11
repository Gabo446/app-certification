import { Injectable } from '@angular/core';
import { collection, addDoc, getDocs, query, doc, getDoc, updateDoc, deleteDoc, CollectionReference, DocumentReference, Firestore, getFirestore } from 'firebase/firestore';
import { firestore } from '../../firebase.config';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  private db = firestore;

  // Obtener colección
  async getCollection(collectionName: string): Promise<any[]> {
    const snapshot = await getDocs(collection(this.db, collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Agregar documento
  async addDocument(collectionName: string, data: any): Promise<void> {
    await addDoc(collection(this.db, collectionName), data);
  }

  // Obtener documento por ID
  async getDocument(collectionName: string, docId: string): Promise<any> {
    const docRef = doc(this.db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  }

  // Actualizar documento
  async updateDocument(collectionName: string, docId: string, data: any): Promise<void> {
    const docRef = doc(this.db, collectionName, docId);
    await updateDoc(docRef, data);
  }

  // Eliminar documento
  async deleteDocument(collectionName: string, docId: string): Promise<void> {
    const docRef = doc(this.db, collectionName, docId);
    await deleteDoc(docRef);
  }
}
