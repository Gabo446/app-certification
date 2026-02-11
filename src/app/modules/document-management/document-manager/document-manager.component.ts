// document-manager.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Firestore, collection, addDoc, updateDoc, doc as firestoreDoc, query, where, getDocs, deleteDoc, Timestamp, orderBy } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { toast } from 'ngx-sonner';
import { NavbarComponent } from '../../layout/components/navbar/navbar.component';
import { SidebarComponent } from '../../layout/components/sidebar/sidebar.component';

interface VersionLog {
  version: string;
  uploadDate: Timestamp;
  uploadedBy: string;
  uploadedByEmail: string;
  versionOwner: string;
  reviewer: string | null;
  approver: string | null;
  status: 'draft' | 'in_review' | 'approved' | 'rejected';
  comments?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
}

interface DocumentVersion {
  id?: string;
  // Datos paso 1
  createdBy: string;
  createdByEmail: string;
  createdDate: Timestamp;
  initialStatus: 'published' | 'draft';
  version: string;
  code: string;
  area: string;
  description: string;

  // Datos paso 2
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedBy: string;
  uploadedByEmail: string;
  uploadDate: Timestamp;
  versionOwner: string;
  reviewer: string | null;
  approver: string | null;
  status: 'draft' | 'in_review' | 'approved' | 'rejected' | 'obsolete';
  reviewDate?: Timestamp;
  approvalDate?: Timestamp;
  comments?: string;

  // Control de versiones
  isLatestVersion: boolean;
  versionHistory: VersionLog[];
  baseDocumentId?: string; // ID del documento original para vincular versiones
}

@Component({
  selector: 'app-document-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NavbarComponent, SidebarComponent],
  templateUrl: './document-manager.component.html',
  styleUrls: ['./document-manager.component.css'],
})
export class DocumentManagerComponent implements OnInit {
  private storage = inject(Storage);
  private firestore = inject(Firestore);
  protected auth = inject(Auth);
  private fb = inject(FormBuilder);

  documents: DocumentVersion[] = [];
  selectedFile: File | null = null;
  uploadProgress: number = 0;
  isUploading: boolean = false;
  showUploadModal: boolean = false;
  showReviewModal: boolean = false;
  showVersionHistoryModal: boolean = false;
  selectedDocument: DocumentVersion | null = null;

  // Control de pasos
  currentStep: number = 1;
  isNewVersion: boolean = false;
  baseDocumentForNewVersion: DocumentVersion | null = null;

  // Formularios
  step1Form: FormGroup;
  step2Form: FormGroup;
  reviewForm: FormGroup;

  filterStatus: string = 'all';
  searchTerm: string = '';

  constructor() {
    // Formulario Paso 1: Información inicial del documento
    this.step1Form = this.fb.group({
      version: ['1.0', Validators.required],
      code: ['', Validators.required],
      area: ['', Validators.required],
      description: ['', Validators.required],
      initialStatus: ['published', Validators.required],
    });

    // Formulario Paso 2: Carga de archivo y asignación de responsables
    this.step2Form = this.fb.group({
      versionOwner: ['', Validators.required],
      reviewer: ['', Validators.required],
      approver: ['', Validators.required],
      comments: [''],
    });

    this.reviewForm = this.fb.group({
      status: ['', Validators.required],
      comments: [''],
    });
  }

  ngOnInit() {
    this.loadDocuments();
  }

  async loadDocuments() {
    try {
      const documentsRef = collection(this.firestore, 'documents');
      const q = query(documentsRef, where('isLatestVersion', '==', true), orderBy('uploadDate', 'desc'));
      const querySnapshot = await getDocs(q);

      this.documents = querySnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as DocumentVersion),
      );
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Error al cargar documentos');
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  openUploadModal() {
    this.showUploadModal = true;
    this.currentStep = 1;
    this.isNewVersion = false;
    this.baseDocumentForNewVersion = null;
    this.step1Form.reset({
      version: '1.0',
      initialStatus: 'published',
    });
    this.step2Form.reset();
    this.selectedFile = null;
  }

  openNewVersionModal(doc: DocumentVersion) {
    this.showUploadModal = true;
    this.currentStep = 1;
    this.isNewVersion = true;
    this.baseDocumentForNewVersion = doc;

    // Pre-llenar datos del documento base
    const newVersionNumber = this.incrementVersion(doc.version);
    this.step1Form.patchValue({
      version: newVersionNumber,
      code: doc.code,
      area: doc.area,
      description: doc.description,
      initialStatus: 'published',
    });

    this.step2Form.reset();
    this.selectedFile = null;
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.currentStep = 1;
    this.isNewVersion = false;
    this.baseDocumentForNewVersion = null;
    this.step1Form.reset();
    this.step2Form.reset();
    this.selectedFile = null;
  }

  nextStep() {
    if (this.currentStep === 1 && this.step1Form.valid) {
      this.currentStep = 2;
    }
  }

  previousStep() {
    if (this.currentStep === 2) {
      this.currentStep = 1;
    }
  }

  incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;

    // Incrementar versión menor
    return `${major}.${minor + 1}`;
  }

  async uploadDocument() {
    if (!this.selectedFile || !this.step1Form.valid || !this.step2Form.valid || !this.auth.currentUser) {
      toast.error('Por favor complete todos los campos requeridos');
      return;
    }

    this.isUploading = true;
    const file = this.selectedFile;
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `documents/${this.auth.currentUser.uid}/${fileName}`;
    const storageRef = ref(this.storage, filePath);

    try {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          this.uploadProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        },
        (error) => {
          console.error('Upload error:', error);
          toast.error('Error al subir el archivo');
          this.isUploading = false;
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          if (this.isNewVersion && this.baseDocumentForNewVersion) {
            // Es una nueva versión - marcar la anterior como obsoleta
            await this.createNewVersion(downloadURL, filePath, file);
          } else {
            // Es un documento nuevo
            await this.createNewDocument(downloadURL, filePath, file);
          }

          toast.success(`Documento subido exitosamente (Versión ${this.step1Form.value.version})`);
          this.loadDocuments();
          this.closeUploadModal();
          this.isUploading = false;
          this.uploadProgress = 0;
        },
      );
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Error al subir el documento');
      this.isUploading = false;
    }
  }

  async createNewDocument(downloadURL: string, filePath: string, file: File) {
    const now = Timestamp.now();
    const versionLog: VersionLog = {
      version: this.step1Form.value.version,
      uploadDate: now,
      uploadedBy: this.auth.currentUser!.displayName || 'Usuario',
      uploadedByEmail: this.auth.currentUser!.email || '',
      versionOwner: this.step2Form.value.versionOwner,
      reviewer: this.step2Form.value.reviewer,
      approver: this.step2Form.value.approver,
      status: this.step1Form.value.initialStatus === 'draft' ? 'draft' : 'in_review',
      comments: this.step2Form.value.comments,
      fileName: file.name,
      fileUrl: downloadURL,
      fileSize: file.size,
    };

    const documentData: Omit<DocumentVersion, 'id'> = {
      // Paso 1
      createdBy: this.auth.currentUser!.displayName || 'Usuario',
      createdByEmail: this.auth.currentUser!.email || '',
      createdDate: now,
      initialStatus: this.step1Form.value.initialStatus,
      version: this.step1Form.value.version,
      code: this.step1Form.value.code,
      area: this.step1Form.value.area,
      description: this.step1Form.value.description,

      // Paso 2
      fileName: file.name,
      fileUrl: downloadURL,
      filePath: filePath,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: this.auth.currentUser!.displayName || 'Usuario',
      uploadedByEmail: this.auth.currentUser!.email || '',
      uploadDate: now,
      versionOwner: this.step2Form.value.versionOwner,
      reviewer: this.step2Form.value.reviewer,
      approver: this.step2Form.value.approver,
      status: this.step1Form.value.initialStatus === 'draft' ? 'draft' : 'in_review',
      comments: this.step2Form.value.comments,

      // Control de versiones
      isLatestVersion: true,
      versionHistory: [versionLog],
    };

    await addDoc(collection(this.firestore, 'documents'), documentData);
  }

  async createNewVersion(downloadURL: string, filePath: string, file: File) {
    const baseDoc = this.baseDocumentForNewVersion!;
    const now = Timestamp.now();

    // Crear log de esta nueva versión
    const newVersionLog: VersionLog = {
      version: this.step1Form.value.version,
      uploadDate: now,
      uploadedBy: this.auth.currentUser!.displayName || 'Usuario',
      uploadedByEmail: this.auth.currentUser!.email || '',
      versionOwner: this.step2Form.value.versionOwner,
      reviewer: this.step2Form.value.reviewer,
      approver: this.step2Form.value.approver,
      status: this.step1Form.value.initialStatus === 'draft' ? 'draft' : 'in_review',
      comments: this.step2Form.value.comments,
      fileName: file.name,
      fileUrl: downloadURL,
      fileSize: file.size,
    };

    // Actualizar versión anterior a obsoleta
    const oldDocRef = firestoreDoc(this.firestore, 'documents', baseDoc.id!);
    await updateDoc(oldDocRef, {
      isLatestVersion: false,
      status: 'obsolete',
    });

    // Crear nuevo documento con toda la historia
    const newDocumentData: Omit<DocumentVersion, 'id'> = {
      // Mantener datos del paso 1 del documento original
      createdBy: baseDoc.createdBy,
      createdByEmail: baseDoc.createdByEmail,
      createdDate: baseDoc.createdDate,
      initialStatus: this.step1Form.value.initialStatus,
      version: this.step1Form.value.version,
      code: this.step1Form.value.code,
      area: this.step1Form.value.area,
      description: this.step1Form.value.description,

      // Nuevos datos del paso 2
      fileName: file.name,
      fileUrl: downloadURL,
      filePath: filePath,
      fileSize: file.size,
      fileType: file.type,
      uploadedBy: this.auth.currentUser!.displayName || 'Usuario',
      uploadedByEmail: this.auth.currentUser!.email || '',
      uploadDate: now,
      versionOwner: this.step2Form.value.versionOwner,
      reviewer: this.step2Form.value.reviewer,
      approver: this.step2Form.value.approver,
      status: this.step1Form.value.initialStatus === 'draft' ? 'draft' : 'in_review',
      comments: this.step2Form.value.comments,

      // Control de versiones
      isLatestVersion: true,
      versionHistory: [...baseDoc.versionHistory, newVersionLog],
      baseDocumentId: baseDoc.baseDocumentId || baseDoc.id,
    };

    await addDoc(collection(this.firestore, 'documents'), newDocumentData);
  }

  async downloadDocument(doc: DocumentVersion) {
    try {
      const link = document.createElement('a');
      link.href = doc.fileUrl;
      link.download = doc.fileName;
      link.target = '_blank';
      link.click();
      toast.success('Descargando documento...');
    } catch (error) {
      console.error('Error downloading document:', error);
      toast.error('Error al descargar el documento');
    }
  }

  openReviewModal(doc: DocumentVersion) {
    this.selectedDocument = doc;
    this.showReviewModal = true;
    this.reviewForm.patchValue({
      status: doc.status,
      comments: doc.comments || '',
    });
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.selectedDocument = null;
    this.reviewForm.reset();
  }

  openVersionHistoryModal(doc: DocumentVersion) {
    this.selectedDocument = doc;
    this.showVersionHistoryModal = true;
  }

  closeVersionHistoryModal() {
    this.showVersionHistoryModal = false;
    this.selectedDocument = null;
  }

  async updateDocumentStatus() {
    if (!this.selectedDocument || !this.reviewForm.valid) {
      toast.error('Por favor complete todos los campos');
      return;
    }

    try {
      const docRef = firestoreDoc(this.firestore, 'documents', this.selectedDocument.id!);
      const updateData: any = {
        status: this.reviewForm.value.status,
        comments: this.reviewForm.value.comments,
      };

      if (this.reviewForm.value.status === 'in_review') {
        updateData.reviewDate = Timestamp.now();
      } else if (this.reviewForm.value.status === 'approved') {
        updateData.approvalDate = Timestamp.now();
      }

      await updateDoc(docRef, updateData);

      toast.success('Estado del documento actualizado');
      this.loadDocuments();
      this.closeReviewModal();
    } catch (error) {
      console.error('Error updating document:', error);
      toast.error('Error al actualizar el documento');
    }
  }

  async deleteDocument(doc: DocumentVersion) {
    if (!confirm('¿Está seguro de eliminar este documento y todas sus versiones?')) {
      return;
    }

    try {
      // Eliminar de Storage
      const storageRef = ref(this.storage, doc.filePath);
      await deleteObject(storageRef);

      // Eliminar de Firestore
      await deleteDoc(firestoreDoc(this.firestore, 'documents', doc.id!));

      // Si hay versiones antiguas, también las eliminamos (opcional)
      if (doc.baseDocumentId || doc.versionHistory.length > 1) {
        const q = query(
          collection(this.firestore, 'documents'),
          where('baseDocumentId', '==', doc.baseDocumentId || doc.id),
        );
        const oldVersions = await getDocs(q);

        for (const oldDoc of oldVersions.docs) {
          const oldData = oldDoc.data() as DocumentVersion;
          const oldStorageRef = ref(this.storage, oldData.filePath);
          await deleteObject(oldStorageRef);
          await deleteDoc(firestoreDoc(this.firestore, 'documents', oldDoc.id));
        }
      }

      toast.success('Documento eliminado exitosamente');
      this.loadDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error al eliminar el documento');
    }
  }

  get filteredDocuments() {
    return this.documents.filter((doc) => {
      const matchesStatus = this.filterStatus === 'all' || doc.status === this.filterStatus;
      const matchesSearch =
        doc.fileName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        doc.code.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        doc.area.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        doc.uploadedBy.toLowerCase().includes(this.searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  get currentDate(): Date {
    return new Date();
  }

  get creationDate(): string {
    if (this.isNewVersion && this.baseDocumentForNewVersion) {
      return this.baseDocumentForNewVersion.createdDate.toDate().toLocaleDateString('es-CL');
    }
    return new Date().toLocaleDateString('es-CL');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  getStatusBadgeClass(status: string): string {
    const classes = {
      draft: 'bg-gray-100 text-gray-800',
      in_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      obsolete: 'bg-orange-100 text-orange-800',
    };
    return classes[status as keyof typeof classes] || classes.draft;
  }

  getStatusLabel(status: string): string {
    const labels = {
      draft: 'Borrador',
      in_review: 'En Revisión',
      approved: 'Aprobado',
      rejected: 'Rechazado',
      obsolete: 'Obsoleto',
    };
    return labels[status as keyof typeof labels] || status;
  }
}
