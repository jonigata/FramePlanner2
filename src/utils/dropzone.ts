// src/actions/dropzone.ts
type DropHandler = (files: FileList) => void;

export function dropzone(node: HTMLElement, onDrop: DropHandler) {
    const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
        node.classList.add('drag-over');
    };

    const handleDragLeave = (event: DragEvent) => {
        node.classList.remove('drag-over');
    };

    const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        node.classList.remove('drag-over');
        if (event.dataTransfer) {
            const files = event.dataTransfer.files;
            if (files.length > 0) {
                onDrop(files); // 引数で渡された関数を実行
            }
        }
    };

    node.addEventListener('dragover', handleDragOver);
    node.addEventListener('dragleave', handleDragLeave);
    node.addEventListener('drop', handleDrop);

    return {
        destroy() {
            node.removeEventListener('dragover', handleDragOver);
            node.removeEventListener('dragleave', handleDragLeave);
            node.removeEventListener('drop', handleDrop);
        }
    };
}
