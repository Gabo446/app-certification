export interface Document {
  id?: string;
  fileName: string;
  createdBy: string; // UID o email del usuario
  createdAt: Date;
  version: string;
  approver?: string | null;
  reviewer?: string | null;
  storagePath: string; // Ruta en Firebase Storage
}
