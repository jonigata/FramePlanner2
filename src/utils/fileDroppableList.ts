type DropZoneOptions = {
  onFileDrop: (files: FileList, index: number) => void;
  onDragUpdate: (index: number) => void;
  onDragEnter: (files: DataTransfer) => void;
  onDragLeave: () => void;
};

export function fileDroppableList(node: HTMLElement, options: DropZoneOptions) {
  let dragEnterCount = 0;

  function getDropIndex(x: number, y: number) {
    const children = Array.from(node.children);
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const rect = child.getBoundingClientRect();
      if (isPointInRect(x, y, rect)) {
        return i;
      }
    }
    return children.length;
  }

  function isPointInRect(x: number, y: number, rect: DOMRect) {
    return rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom;
  }

  function onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragEnterCount++;
    if (dragEnterCount === 1) {
      options.onDragEnter(ev.dataTransfer);
    }
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    const index = getDropIndex(ev.clientX, ev.clientY);
    options.onDragUpdate(index);
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragEnterCount--;
    if (dragEnterCount === 0) {
      options.onDragLeave();
      options.onDragUpdate(-1);
    }
  }

  function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    dragEnterCount = 0;
    options.onDragLeave();
    options.onDragUpdate(-1);

    const index = getDropIndex(ev.clientX, ev.clientY);
    const dt = ev.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      options.onFileDrop(files, index);
    }
  }

  node.addEventListener('dragenter', onDragEnter);
  node.addEventListener('dragover', onDragOver);
  node.addEventListener('dragleave', onDragLeave);
  node.addEventListener('drop', onDrop);

  return {
    destroy() {
      node.removeEventListener('dragenter', onDragEnter);
      node.removeEventListener('dragover', onDragOver);
      node.removeEventListener('dragleave', onDragLeave);
      node.removeEventListener('drop', onDrop);
    },
    update(newOptions: DropZoneOptions) {
      options = newOptions;
    }
  };
}

export class FileDroppableContainer<T> {
  private fileList: T[];
  private pendingFiles: T[] | null = null;
  private importer: (files: FileList) => T[];
  private onUpdate: (fileList: T[], pendingFiles: T[] | null) => void;
  private isReversed: boolean;
  
  constructor(
    initialList: T[],
    importer: (files: FileList) => T[], 
    onUpdate: (fileList: T[], pendingFiles: T[] | null) => void,
    isReversed: boolean = false
  ) {
    this.fileList = initialList;
    this.importer = importer;
    this.onUpdate = onUpdate;
    this.isReversed = isReversed;
  }

  private getActualIndex(index: number): number {
    return this.isReversed ? this.fileList.length - index : index;
  }

  private importFiles(files: FileList): T[] {
    if (!this.pendingFiles) {
      this.pendingFiles = this.importer(files);
    }
    return this.pendingFiles;
  }

  handleFileDrop(files: FileList, index: number): void {
    console.log('handleFileDrop', index);
    const importedFiles = this.importFiles(files);
    if (importedFiles.length === 0) {
      this.pendingFiles = null;
      return;
    }
    const actualIndex = this.getActualIndex(index);
    this.fileList.splice(actualIndex, 0, ...importedFiles);
    this.onUpdate(this.fileList, null);
    this.pendingFiles = null;
  }

  handleDragUpdate(index: number): void {
    if (this.pendingFiles && this.pendingFiles.length > 0) {
      const actualIndex = this.getActualIndex(index);
      const currentIndex = this.fileList.indexOf(this.pendingFiles[0]);
      if (currentIndex !== -1 && currentIndex !== actualIndex) {
        this.fileList = this.fileList.filter(file => !this.pendingFiles.includes(file));
        this.fileList.splice(actualIndex, 0, ...this.pendingFiles);
        this.onUpdate(this.fileList, this.pendingFiles);
      }
    }
  }

  handleDragEnter(dataTransfer: DataTransfer): void {
    if (dataTransfer && dataTransfer.files.length > 0) {
      const importedFiles = this.importFiles(dataTransfer.files);
      if (importedFiles.length > 0) {
        if (this.isReversed) {
          this.fileList.unshift(...importedFiles);
        } else {
          this.fileList.push(...importedFiles);
        }
        this.onUpdate(this.fileList, importedFiles);
      }
    }
  }

  handleDragLeave(): void {
    if (this.pendingFiles) {
      this.fileList = this.fileList.filter(file => !this.pendingFiles.includes(file));
      this.pendingFiles = null;
      this.onUpdate(this.fileList, null);
    }
  }

  getDropZoneProps() {
    return {
      onFileDrop: this.handleFileDrop.bind(this),
      onDragUpdate: this.handleDragUpdate.bind(this),
      onDragEnter: this.handleDragEnter.bind(this),
      onDragLeave: this.handleDragLeave.bind(this)
    };
  }

  getFileList(): T[] {
    return this.isReversed ? [...this.fileList].reverse() : [...this.fileList];
  }

  getPendingFiles(): T[] | null {
    return this.pendingFiles;
  }
}
