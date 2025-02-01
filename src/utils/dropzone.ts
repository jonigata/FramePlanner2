// src/actions/dropzone.ts
type DropHandler = (files: FileList) => void;

export function dropzone(node: HTMLElement, onDrop: DropHandler) {
    let dragCounter = 0;

    const handleDragEnter = (event: DragEvent) => {
        event.preventDefault();
        dragCounter++;
        if (dragCounter === 1) {
            node.classList.add('drag-over');
        }
    };

    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
    };

    const handleDragLeave = (event: DragEvent) => {
        event.preventDefault();
        dragCounter--;
        if (dragCounter === 0) {
            node.classList.remove('drag-over');
        }
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        dragCounter = 0;
        node.classList.remove('drag-over');
        if (event.dataTransfer) {
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                onDrop(files);
            }
        }
    };

    node.addEventListener('dragenter', handleDragEnter);
    node.addEventListener('dragover', handleDragOver);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('drop', handleDrop);

    return {
        destroy() {
            node.removeEventListener('dragenter', handleDragEnter);
            node.removeEventListener('dragover', handleDragOver);
            node.removeEventListener('dragleave', handleDragLeave);
            node.removeEventListener('drop', handleDrop);
        }
    };
}
