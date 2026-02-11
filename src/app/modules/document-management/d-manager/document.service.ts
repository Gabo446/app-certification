import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, getDoc, Timestamp } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

export interface DocumentRecord {
  id?: string;
  userId: string;
  userEmail: string;
  fileName: string;
  htmlContent: string;
  uploadDate: Date;
  fileSize: number;
  // Nuevos campos
  createdBy: string; // Email del usuario que confecciona
  status: 'publicado' | 'borrador';
  creationDate: Date;
  version: string;
  code: string;
  area: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private collectionName = 'documents';

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) {}

  // Guardar documento en Firebase
  async saveDocument(
    fileName: string,
    htmlContent: string,
    fileSize: number,
    metadata: {
      status: 'publicado' | 'borrador';
      version: string;
      code: string;
      area: string;
      description: string;
    }
  ): Promise<string> {
    const user = this.auth.currentUser;

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const documentData: Omit<DocumentRecord, 'id'> = {
      userId: user.uid,
      userEmail: user.email || '',
      fileName: fileName,
      htmlContent: htmlContent,
      uploadDate: new Date(),
      fileSize: fileSize,
      createdBy: user.email || '',
      status: metadata.status,
      creationDate: new Date(),
      version: metadata.version,
      code: metadata.code,
      area: metadata.area,
      description: metadata.description
    };

    const docRef = await addDoc(collection(this.firestore, this.collectionName), documentData);
    return docRef.id;
  }

  // Obtener todos los documentos del usuario actual
  async getUserDocuments(): Promise<DocumentRecord[]> {
    const auth = getAuth();

    const user: User | null = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });

    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const q = query(
      collection(this.firestore, this.collectionName),
      where('userId', '==', user.uid)
    );

    const querySnapshot = await getDocs(q);
    const documents: DocumentRecord[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        id: doc.id,
        userId: data['userId'],
        userEmail: data['userEmail'],
        fileName: data['fileName'],
        htmlContent: data['htmlContent'],
        uploadDate: data['uploadDate']?.toDate() || new Date(),
        fileSize: data['fileSize'],
        createdBy: data['createdBy'] || data['userEmail'],
        status: data['status'] || 'borrador',
        creationDate: data['creationDate']?.toDate() || new Date(),
        version: data['version'] || '1.0',
        code: data['code'] || '',
        area: data['area'] || '',
        description: data['description'] || ''
      });
    });

    return documents.sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());
  }

  // Obtener un documento específico
  async getDocument(documentId: string): Promise<DocumentRecord | null> {
    const docRef = doc(this.firestore, this.collectionName, documentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data['userId'],
        userEmail: data['userEmail'],
        fileName: data['fileName'],
        htmlContent: data['htmlContent'],
        uploadDate: data['uploadDate']?.toDate() || new Date(),
        fileSize: data['fileSize'],
        createdBy: data['createdBy'] || data['userEmail'],
        status: data['status'] || 'borrador',
        creationDate: data['creationDate']?.toDate() || new Date(),
        version: data['version'] || '1.0',
        code: data['code'] || '',
        area: data['area'] || '',
        description: data['description'] || ''
      };
    }

    return null;
  }

  // Verificar si el usuario es dueño del documento
  async isDocumentOwner(documentId: string): Promise<boolean> {
    const user = this.auth.currentUser;

    if (!user) {
      return false;
    }

    const document = await this.getDocument(documentId);
    return document?.userId === user.uid;
  }
}
