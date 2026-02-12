import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxFileDropModule, NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';
import * as fileSaver from 'file-saver';
import { DocumentService, DocumentRecord } from './document.service';
import { toast } from 'ngx-sonner';

interface DocumentMetadata {
  status: 'publicado' | 'borrador';
  version: string;
  code: string;
  area: string;
  description: string;
}

@Component({
  selector: 'app-d-manager',
  standalone: true,
  imports: [CommonModule, NgxFileDropModule, FormsModule],
  templateUrl: './d-manager.component.html',
  styleUrls: ['./d-manager.component.css']
})
export class DManagerComponent implements OnInit {
  @ViewChild('contentEditor') contentEditor!: ElementRef;

  // Estados
  htmlContent: string = '';
  isLoading: boolean = false;
  fileName: string = 'documento';
  viewMode: 'upload' | 'list' | 'view' | 'metadata' = 'upload';

  // Lista de documentos
  userDocuments: DocumentRecord[] = [];
  selectedDocument: DocumentRecord | null = null;

  // Modo de solo lectura
  isReadOnly: boolean = false;

  // Archivo temporal para el segundo paso
  tempFile: File | null = null;
  tempHtmlContent: string = '';

  // Metadatos del documento
  documentMetadata: DocumentMetadata = {
    status: 'borrador',
    version: '1.0',
    code: '',
    area: '',
    description: ''
  };

  // Usuario actual
  currentUserEmail: string = '';
  currentDate: Date = new Date();

  constructor(
    private documentService: DocumentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    const docId = this.route.snapshot.paramMap.get('id');
    // Obtener email del usuario actual
    const auth = this.documentService['auth'];
    this.currentUserEmail = auth.currentUser?.email || '';

    await this.loadUserDocuments();
  }

  async loadDocumentById(documentId: string): Promise<void> {
    this.isLoading = true;

    try {
      const document = await this.documentService.getDocument(documentId);

      if (document) {
        this.selectedDocument = document;
        this.htmlContent = document.htmlContent;
        this.fileName = document.fileName;
        this.viewMode = 'view';
        this.isReadOnly = true;
      } else {
        toast.error('Documento no encontrado');
        this.router.navigate(['/word-editor']);
      }
    } catch (error) {
      console.error('Error al cargar documento:', error);
      toast.error('Error al cargar el documento');
    } finally {
      this.isLoading = false;
    }
  }

  async loadUserDocuments(): Promise<void> {
    this.isLoading = true;

    try {
      this.userDocuments = await this.documentService.getUserDocuments();
      this.viewMode = this.userDocuments.length > 0 ? 'list' : 'upload';
    } catch (error) {
      console.error('Error al cargar documentos:', error);
      this.viewMode = 'upload';
    } finally {
      this.isLoading = false;
    }
  }

  async onFileDropped(files: NgxFileDropEntry[]): Promise<void> {
    if (files.length === 0) return;

    const droppedFile = files[0];

    if (droppedFile.fileEntry.isFile) {
      const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;

      fileEntry.file(async (file: File) => {
        if (file.name.endsWith('.docx')) {
          this.fileName = file.name.replace('.docx', '');
          await this.processDocxFile(file);
        } else {
          toast.error('Por favor, selecciona un archivo .docx válido');
        }
      });
    }
  }

  // Procesar el archivo y pasar al segundo paso
  async processDocxFile(file: File): Promise<void> {
    this.isLoading = true;

    try {
      const arrayBuffer = await file.arrayBuffer();

      const options: any = {
        arrayBuffer,
        convertImage: mammoth.images.imgElement((image: any) => {
          return image.read("base64").then((imageBuffer: any) => {
            return {
              src: "data:" + image.contentType + ";base64," + imageBuffer
            };
          });
        }),
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
          "r[style-name='Strong'] => strong"
        ]
      };

      const result = await mammoth.convertToHtml(options);

      // Guardar temporalmente
      this.tempFile = file;
      this.tempHtmlContent = result.value;

      if (result.messages.length > 0) {
        console.warn('Advertencias de conversión:', result.messages);
      }

      // Resetear metadatos
      this.documentMetadata = {
        status: 'borrador',
        version: '1.0',
        code: '',
        area: '',
        description: ''
      };

      // Actualizar fecha actual
      this.currentDate = new Date();

      // Ir al segundo paso
      this.viewMode = 'metadata';
    } catch (error) {
      console.error('Error al procesar el archivo:', error);
      toast.error('Error al procesar el documento. Por favor, intenta con otro archivo.');
    } finally {
      this.isLoading = false;
    }
  }

  // Guardar documento con metadatos
  async saveDocumentWithMetadata(): Promise<void> {
    // Validaciones
    if (!this.documentMetadata.code.trim()) {
      toast.error('El código es obligatorio');
      return;
    }

    if (!this.documentMetadata.area.trim()) {
      toast.error('El área es obligatoria');
      return;
    }

    if (!this.documentMetadata.description.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    if (!this.documentMetadata.version.trim()) {
      toast.error('La versión es obligatoria');
      return;
    }

    if (!this.tempFile) {
      toast.error('No hay archivo para guardar');
      return;
    }

    this.isLoading = true;

    try {
      const documentId = await this.documentService.saveDocument(
        this.fileName,
        this.tempHtmlContent,
        this.tempFile.size,
        this.documentMetadata
      );

      // Limpiar temporales
      this.tempFile = null;
      this.tempHtmlContent = '';

      toast.success('Documento guardado exitosamente');

      // Cargar la lista actualizada
      await this.loadUserDocuments();
      this.viewMode = 'list';
    } catch (error) {
      console.error('Error al guardar documento:', error);
      toast.error('Error al guardar el documento. Por favor, intenta nuevamente.');
    } finally {
      this.isLoading = false;
    }
  }

  // Cancelar y volver a upload
  cancelMetadata(): void {
    this.tempFile = null;
    this.tempHtmlContent = '';
    this.documentMetadata = {
      status: 'borrador',
      version: '1.0',
      code: '',
      area: '',
      description: ''
    };
    this.viewMode = 'upload';
  }

  viewDocument(document: DocumentRecord): void {
    this.selectedDocument = document;
    this.htmlContent = document.htmlContent;
    this.fileName = document.fileName;
    this.viewMode = 'view';
    this.isReadOnly = true;
  }

  async downloadDocument(): Promise<void> {
    if (!this.htmlContent) {
      toast.error('No hay contenido para descargar');
      return;
    }

    this.isLoading = true;

    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = this.htmlContent;

      const children: any[] = [];

      const getTextRunStyle = (element: HTMLElement) => {
        const style = window.getComputedStyle(element);
        const inlineStyle = element.style;

        return {
          bold: element.tagName === 'STRONG' || element.tagName === 'B' ||
            style.fontWeight === 'bold' || style.fontWeight === '700' || parseInt(style.fontWeight) >= 700,
          italics: element.tagName === 'EM' || element.tagName === 'I' || style.fontStyle === 'italic',
          underline: (element.tagName === 'U' || style.textDecoration.includes('underline')) ?
            { type: UnderlineType.SINGLE } : undefined,
          strike: style.textDecoration.includes('line-through'),
          color: inlineStyle.color ? this.rgbToHex(style.color) : undefined,
          highlight: inlineStyle.backgroundColor ? this.rgbToHex(style.backgroundColor) : undefined,
          size: inlineStyle.fontSize ? this.pxToHalfPoints(style.fontSize) : undefined,
          font: inlineStyle.fontFamily ? style.fontFamily.replace(/['"]/g, '').split(',')[0].trim() : undefined,
        };
      };

      const processNode = (node: Node, inheritedStyles: any = {}): any[] => {
        const results: any[] = [];

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            results.push(new TextRun({ text, ...inheritedStyles }));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();

          const currentStyles = { ...inheritedStyles, ...getTextRunStyle(element) };

          if (tagName === 'br') {
            results.push(new TextRun({ text: '', break: 1 }));
          } else if (['strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span'].includes(tagName)) {
            Array.from(element.childNodes).forEach(child => {
              results.push(...processNode(child, currentStyles));
            });
          } else if (tagName.match(/^h[1-6]$/)) {
            const text = element.textContent?.trim() || '';
            if (text) {
              results.push({ type: 'heading', level: parseInt(tagName[1]), text });
            }
          } else if (tagName === 'p' || tagName === 'div') {
            const textRuns: any[] = [];
            Array.from(element.childNodes).forEach(child => {
              textRuns.push(...processNode(child, currentStyles));
            });

            if (textRuns.length > 0) {
              const alignment = element.style.textAlign;
              const align = alignment === 'center' ? AlignmentType.CENTER :
                alignment === 'right' ? AlignmentType.RIGHT :
                  alignment === 'justify' ? AlignmentType.JUSTIFIED : AlignmentType.LEFT;

              results.push({
                type: 'paragraph',
                children: textRuns.filter((run: any) => run instanceof TextRun || run.break),
                alignment: align
              });
            }
          } else {
            Array.from(element.childNodes).forEach(child => {
              results.push(...processNode(child, currentStyles));
            });
          }
        }

        return results;
      };

      Array.from(tempDiv.childNodes).forEach((node) => {
        const processed = processNode(node);

        processed.forEach((item: any) => {
          if (item.type === 'heading') {
            children.push(new Paragraph({
              text: item.text,
              heading: item.level === 1 ? HeadingLevel.HEADING_1 :
                item.level === 2 ? HeadingLevel.HEADING_2 :
                  item.level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
            }));
          } else if (item.type === 'paragraph') {
            children.push(new Paragraph({
              children: item.children,
              alignment: item.alignment
            }));
          } else if (item instanceof TextRun) {
            children.push(new Paragraph({ children: [item] }));
          }
        });
      });

      if (children.length === 0) {
        children.push(new Paragraph({ children: [new TextRun('Documento vacío')] }));
      }

      const doc = new Document({
        sections: [{ properties: {}, children }],
      });

      const blob = await Packer.toBlob(doc);
      fileSaver.saveAs(blob, `${this.fileName}.docx`);

      toast.success('Documento descargado exitosamente');
    } catch (error) {
      console.error('Error al generar el documento:', error);
      toast.error('Error al generar el documento. Por favor, intenta nuevamente.');
    } finally {
      this.isLoading = false;
    }
  }

  private rgbToHex(rgb: string): string {
    if (rgb.startsWith('#')) return rgb;

    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return '';

    const r = parseInt(result[0]);
    const g = parseInt(result[1]);
    const b = parseInt(result[2]);

    return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  private pxToHalfPoints(px: string): number {
    const pxValue = parseFloat(px);
    return Math.round((pxValue / 1.333) * 2);
  }

  backToList(): void {
    this.selectedDocument = null;
    this.htmlContent = '';
    this.viewMode = 'list';
    this.isReadOnly = false;
    this.loadUserDocuments();
  }

  goToUpload(): void {
    this.viewMode = 'upload';
    this.selectedDocument = null;
    this.htmlContent = '';
    this.isReadOnly = false;
    this.tempFile = null;
    this.tempHtmlContent = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
