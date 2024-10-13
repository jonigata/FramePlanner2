type DropZoneOptions = {
  onFileDrop: (files: FileList, index: number) => Promise<void>;
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
      const dt = ev.dataTransfer!;
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
      const childBottom = childRect.bottom - rect.top - childRect.height / 2;
      const isGhost = child.dataset.ghost !== undefined;

      if (relativeY < childBottom) {
        if (isGhost) {
          return realIndex;
        }
        return realIndex;
      }

      if (!isGhost) {
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
  private isDragging: boolean = false;
  private ghostIndex: number = -1;
  
  constructor(
    private importer: (files: FileList) => Promise<T[]>, 
    private onAccept: (index: number, elements: T[]) => void,
    private onGhost: (isDragging: boolean, ghostIndex: number) => void
  ) {
  }

  async handleFileDrop(files: FileList, index: number): Promise<void> {
    const importedFiles = await this.importer(files);
    if (importedFiles.length === 0) {
      return;
    }
    this.isDragging = false;
    this.ghostIndex = -1;
    this.onAccept(index, importedFiles);
  }

  handleDragUpdate(index: number): void {
    if (index !== this.ghostIndex) {
      this.ghostIndex = index;
      this.onGhost(this.isDragging, this.ghostIndex);
    }
  }

  handleDragStart(): void {
    this.isDragging = true;
    this.onGhost(true, this.ghostIndex);
  }

  handleDragEnd(): void {
    this.isDragging = false;
    this.ghostIndex = -1;
    this.onGhost(false, -1);
  }

  getDropZoneProps() {
    return {
      onFileDrop: this.handleFileDrop.bind(this),
      onDragUpdate: this.handleDragUpdate.bind(this),
      onDragStart: this.handleDragStart.bind(this),
      onDragEnd: this.handleDragEnd.bind(this)
    };
  }
}
