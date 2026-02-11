import { Component, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxFileDropModule, NgxFileDropEntry, FileSystemFileEntry } from 'ngx-file-drop';
import * as mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } from 'docx';
import * as fileSaver from 'file-saver';

@Component({
  selector: 'app-word-editor',
  standalone: true,
  imports: [CommonModule, NgxFileDropModule],
  templateUrl: './word-editor.component.html',
  styleUrls: ['./word-editor.component.css']
})
export class WordEditorComponent {
  @ViewChild('contentEditor') contentEditor!: ElementRef;

  htmlContent: string = '';
  isLoading: boolean = false;
  protected fileName: string = 'documento';
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private maxHistorySize: number = 50;
  private isInternalChange: boolean = false;

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.htmlContent) return;

    // Ctrl+Z para deshacer
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    }

    // Ctrl+Y o Cmd+Shift+Z para rehacer
    if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.shiftKey && event.key === 'z'))) {
      event.preventDefault();
      this.redo();
    }

    // Ctrl+B para negrita
    if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
      event.preventDefault();
      this.execCommand('bold');
    }

    // Ctrl+I para cursiva
    if ((event.ctrlKey || event.metaKey) && event.key === 'i') {
      event.preventDefault();
      this.execCommand('italic');
    }

    // Ctrl+U para subrayado
    if ((event.ctrlKey || event.metaKey) && event.key === 'u') {
      event.preventDefault();
      this.execCommand('underline');
    }

    // Ctrl+P para imprimir HTML en consola
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      this.printHTMLToConsole();
    }
  }

  // NUEVA FUNCIÓN: Crear documento desde cero
  createNewDocument(): void {
    this.fileName = 'nuevo_documento';
    this.htmlContent = `
      <h1>Nuevo Documento</h1>
      <p>Comienza a escribir aquí...</p>
    `;
    this.undoStack = [];
    this.redoStack = [];
    this.undoStack.push(this.htmlContent);
  }

  // NUEVA FUNCIÓN: Imprimir HTML en consola
  printHTMLToConsole(): void {
    console.group('📄 Contenido HTML del Documento');
    console.log('Nombre del archivo:', this.fileName);
    console.log('HTML completo:');
    console.log(this.htmlContent);
    console.log('\nHTML formateado:');
    console.log(this.formatHTML(this.htmlContent));
    console.groupEnd();

    // También mostrar alerta visual
    alert('✅ HTML impreso en consola (F12 para ver)');
  }

  // Formatear HTML para mejor visualización
  private formatHTML(html: string): string {
    return html
      .replace(/></g, '>\n<')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  async onFileDropped(files: NgxFileDropEntry[]): Promise<void> {
    if (files.length === 0) return;

    const droppedFile = files[0];

    if (droppedFile.fileEntry.isFile) {
      const fileEntry = droppedFile.fileEntry as FileSystemFileEntry;

      fileEntry.file((file: File) => {
        if (file.name.endsWith('.docx')) {
          this.fileName = file.name.replace('.docx', '');
          this.readDocxFile(file);
        } else {
          alert('Por favor, selecciona un archivo .docx válido');
        }
      });
    }
  }

  async readDocxFile(file: File): Promise<void> {
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
      this.htmlContent = result.value;
      this.undoStack = [result.value];
      this.redoStack = [];

      if (result.messages.length > 0) {
        console.warn('Advertencias de conversión:', result.messages);
      }
    } catch (error) {
      console.error('Error al leer el archivo:', error);
      alert('Error al procesar el documento. Por favor, intenta con otro archivo.');
    } finally {
      this.isLoading = false;
    }
  }

  onContentChange(event: Event): void {
    if (this.isInternalChange) return;

    const target = event.target as HTMLElement;
    const newContent = target.innerHTML;

    if (newContent !== this.htmlContent) {
      this.saveToHistory();
      this.htmlContent = newContent;
    }
  }

  private saveToHistory(): void {
    if (this.htmlContent) {
      this.undoStack.push(this.htmlContent);

      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }

      this.redoStack = [];
    }
  }

  undo(): void {
    if (this.undoStack.length > 1) {
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (!editor) return;

      this.redoStack.push(this.htmlContent);
      this.undoStack.pop();

      const previousState = this.undoStack[this.undoStack.length - 1];
      this.isInternalChange = true;
      this.htmlContent = previousState;
      editor.innerHTML = previousState;

      setTimeout(() => {
        this.isInternalChange = false;
      }, 100);
    }
  }

  redo(): void {
    if (this.redoStack.length > 0) {
      const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
      if (!editor) return;

      const nextState = this.redoStack.pop()!;
      this.undoStack.push(nextState);

      this.isInternalChange = true;
      this.htmlContent = nextState;
      editor.innerHTML = nextState;

      setTimeout(() => {
        this.isInternalChange = false;
      }, 100);
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // FUNCIÓN MEJORADA: execCommand con mejor manejo
  execCommand(command: string, value?: string): void {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editor) return;

    editor.focus();

    // Asegurar que hay una selección o cursor
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    document.execCommand(command, false, value);

    setTimeout(() => {
      this.saveToHistory();
      this.htmlContent = editor.innerHTML;
    }, 50);
  }

  // FUNCIÓN MEJORADA: Insertar encabezados
  insertHeading(level: number): void {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    let container: any = range.commonAncestorContainer;

    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode;
    }

    // Buscar el elemento contenedor más cercano
    let targetElement = container;
    while (targetElement && targetElement !== editor &&
    !['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'].includes(targetElement.tagName)) {
      targetElement = targetElement.parentNode;
    }

    const heading = document.createElement(`h${level}`);

    if (targetElement && targetElement !== editor) {
      heading.innerHTML = targetElement.innerHTML || `Encabezado ${level}`;
      targetElement.parentNode?.replaceChild(heading, targetElement);
    } else {
      const text = selection.toString() || `Encabezado ${level}`;
      heading.textContent = text;
      range.deleteContents();
      range.insertNode(heading);

      // Agregar espacio después
      const br = document.createElement('br');
      heading.parentNode?.insertBefore(br, heading.nextSibling);
    }

    // Colocar cursor al final
    const newRange = document.createRange();
    newRange.selectNodeContents(heading);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);

    this.saveToHistory();
    this.htmlContent = editor.innerHTML;
  }

  // FUNCIÓN MEJORADA: Cambiar tamaño de fuente
  changeFontSize(size: string): void {
    if (!size) return;

    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = size;

    try {
      range.surroundContents(span);
    } catch {
      span.innerHTML = range.toString();
      range.deleteContents();
      range.insertNode(span);
    }

    this.saveToHistory();
    this.htmlContent = editor.innerHTML;
  }

  // FUNCIÓN MEJORADA: Cambiar familia de fuente
  changeFontFamily(font: string): void {
    if (!font) return;

    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editor) return;

    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontFamily = font;

    try {
      range.surroundContents(span);
    } catch {
      span.innerHTML = range.toString();
      range.deleteContents();
      range.insertNode(span);
    }

    this.saveToHistory();
    this.htmlContent = editor.innerHTML;
  }

  // FUNCIÓN MEJORADA: Color de texto
  changeTextColor(color: string): void {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editor) return;

    editor.focus();
    this.execCommand('foreColor', color);
  }

  // FUNCIÓN MEJORADA: Color de fondo
  changeBackgroundColor(color: string): void {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editor) return;

    editor.focus();
    this.execCommand('backColor', color);
  }

  insertLink(): void {
    const url = prompt('Ingresa la URL:');
    if (url) {
      this.execCommand('createLink', url);
    }
  }

  // FUNCIÓN MEJORADA: Insertar tabla
  insertTable(): void {
    const rows = prompt('Número de filas:', '3');
    const cols = prompt('Número de columnas:', '3');

    if (rows && cols) {
      const numRows = parseInt(rows);
      const numCols = parseInt(cols);

      let tableHTML = '<table class="custom-table" style="border-collapse: collapse; width: 100%; margin: 10px 0;"><tbody>';

      for (let i = 0; i < numRows; i++) {
        tableHTML += '<tr>';
        for (let j = 0; j < numCols; j++) {
          tableHTML += '<td style="border: 1px solid #cbd5e1; padding: 8px; min-width: 80px;" contenteditable="true">Celda ' + (i * numCols + j + 1) + '</td>';
        }
        tableHTML += '</tr>';
      }

      tableHTML += '</tbody></table><p><br></p>';

      this.execCommand('insertHTML', tableHTML);
    }
  }

  insertList(ordered: boolean): void {
    this.execCommand(ordered ? 'insertOrderedList' : 'insertUnorderedList');
  }

  changeAlignment(align: string): void {
    const commands: { [key: string]: string } = {
      'left': 'justifyLeft',
      'center': 'justifyCenter',
      'right': 'justifyRight',
      'justify': 'justifyFull'
    };
    this.execCommand(commands[align]);
  }

  async downloadDocument(): Promise<void> {
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
      fileSaver.saveAs(blob, `${this.fileName}_editado.docx`);
    } catch (error) {
      console.error('Error al generar el documento:', error);
      alert('Error al generar el documento. Por favor, intenta nuevamente.');
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

  resetEditor(): void {
    this.htmlContent = '';
    this.fileName = 'documento';
    this.undoStack = [];
    this.redoStack = [];
  }
}
