type DropZoneOptions = {
  onFileDrop: (files: FileList, index: number) => void;
  onDragUpdate: (index: number) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function fileDroppableList(node: HTMLElement, options: DropZoneOptions) {
  let isDragging = false;
  let lastIndex = -1;

  function onDragEnter(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (isFileDrag(ev) && !isDragging) {
      isDragging = true;
      options.onDragStart();
    }
  }

  function onDragOver(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (isDragging) {
      const index = getDropIndex(ev.clientY);
      if (index !== lastIndex) {
        lastIndex = index;
        options.onDragUpdate(index);
      }
    }
  }

  function onDragLeave(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!node.contains(ev.relatedTarget as Node)) {
      endDrag();
    }
  }

  function onDrop(ev: DragEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    if (isDragging) {
      const index = getDropIndex(ev.clientY);
      const dt = ev.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        options.onFileDrop(files, index);
      }
    }
    endDrag();
  }

  function endDrag() {
    if (isDragging) {
      isDragging = false;
      lastIndex = -1;
      options.onDragEnd();
    }
  }

  function isFileDrag(ev: DragEvent): boolean {
    if (ev.dataTransfer) {
      if (ev.dataTransfer.types.includes('Files')) {
        return true;
      }
      if (ev.dataTransfer.types.includes('application/x-moz-file')) {
        return true;
      }
    }
    return false;
  }

  function getDropIndex(y: number): number {
    const children = Array.from(node.children);
    const rect = node.getBoundingClientRect();
    const relativeY = y - rect.top;

    let realIndex = 0;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as HTMLElement;
      const childRect = child.getBoundingClientRect();
      const childBottom = childRect.bottom - rect.top;

      if (relativeY < childBottom) {
        if (child.dataset.ghost !== undefined) {
          return realIndex;
        }
        return realIndex;
      }

      if (child.dataset.ghost === undefined) {
        realIndex++;
      }
    }

    return realIndex;
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
  private importer: (files: FileList) => T[];
  private onUpdate: (fileList: T[], isDragging: boolean, ghostIndex: number) => void;
  private isReversed: boolean;
  private isDragging: boolean = false;
  private ghostIndex: number = -1;
  
  constructor(
    initialList: T[],
    importer: (files: FileList) => T[], 
    onUpdate: (fileList: T[], isDragging: boolean, ghostIndex: number) => void,
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

  handleFileDrop(files: FileList, index: number): void {
    const importedFiles = this.importer(files);
    if (importedFiles.length === 0) {
      return;
    }
    const actualIndex = this.getActualIndex(index);
    this.fileList.splice(actualIndex, 0, ...importedFiles);
    this.isDragging = false;
    this.ghostIndex = -1;
    this.onUpdate(this.fileList, false, -1);
  }

  handleDragUpdate(index: number): void {
    const actualIndex = this.getActualIndex(index);
    if (actualIndex !== this.ghostIndex) {
      this.ghostIndex = actualIndex;
      this.onUpdate(this.fileList, this.isDragging, this.ghostIndex);
    }
  }

  handleDragStart(): void {
    this.isDragging = true;
    this.onUpdate(this.fileList, true, this.ghostIndex);
  }

  handleDragEnd(): void {
    this.isDragging = false;
    this.ghostIndex = -1;
    this.onUpdate(this.fileList, false, -1);
  }

  getDropZoneProps() {
    return {
      onFileDrop: this.handleFileDrop.bind(this),
      onDragUpdate: this.handleDragUpdate.bind(this),
      onDragStart: this.handleDragStart.bind(this),
      onDragEnd: this.handleDragEnd.bind(this)
    };
  }

  getFileList(): T[] {
    return this.isReversed ? [...this.fileList].reverse() : [...this.fileList];
  }
}
