import JSZip from 'jszip';
import { readEnvelope, writeEnvelope } from './envelope';
import type { Book } from './book';

/**
 * 階層構造を表すノードの型定義
 */
export type HierarchyNode = {
  name: string;                   // ノード名（ファイル名またはフォルダ名）
  book?: Book;                    // 対応するBookオブジェクト（ファイルノードの場合）
  children?: HierarchyNode[];     // 子ノード（フォルダノードの場合）
  isFolder: boolean;              // フォルダかどうかのフラグ
};

/**
 * ファイル名やフォルダ名をサニタイズする
 * ZIPファイル内で使用できない文字を置き換える
 */
function sanitizeFileName(name: string): string {
  // 無効な文字の置き換え
  return name
    .replace(/[\/:*?"<>|\\]/g, '_') // Windows/ZIPで無効な文字を置き換え
    .replace(/\s+/g, ' ')           // 連続した空白を1つに
    .trim();                         // 先頭と末尾の空白を削除
}

/**
 * ノード数をカウントする補助関数
 */
function countNodes(node: HierarchyNode): number {
  let count = 1; // 自身をカウント
  if (node.children) {
    for (const child of node.children) {
      count += countNodes(child);
    }
  }
  return count;
}

/**
 * 階層構造のノードを再帰的に処理する関数
 */
async function processNode(
  node: HierarchyNode,
  zip: JSZip,
  currentPath: string,
  onProgress: () => void
): Promise<void> {
  // ファイル名のサニタイズ
  const safeName = sanitizeFileName(node.name);
  
  if (node.isFolder) {
    // フォルダの場合は新しいZIPフォルダを作成
    const newPath = currentPath ? `${currentPath}/${safeName}` : safeName;
    // ルートノードの場合は特別処理（空の名前を使う）
    const folderPath = node.name === 'root' ? '' : newPath;
    const folder = node.name === 'root' ? zip : zip.folder(folderPath)!;
    
    if (node.children) {
      for (const child of node.children) {
        // 子ノードには新しいフォルダオブジェクトと新しいパスを渡す
        const childPath = node.name === 'root' ? '' : newPath;
        await processNode(child, zip, childPath, onProgress);
      }
    }
  } else if (node.book) {
    // ファイルの場合はenvelopeを生成してZIPに追加
    const filePath = currentPath ? `${currentPath}/${safeName}.envelope` : `${safeName}.envelope`;
    const blob = await writeEnvelope(node.book, () => {});
    zip.file(filePath, blob);
    onProgress();
  }
}

/**
 * 階層構造をZIPに変換するメイン関数
 */
export async function writeHierarchicalEnvelopeZip(
  rootNode: HierarchyNode, 
  progress: (n: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  let processedCount = 0;
  const totalNodes = countNodes(rootNode);
  
  // 再帰的に階層構造を処理
  await processNode(rootNode, zip, '', () => {
    processedCount++;
    progress(processedCount / totalNodes);
  });
  
  // ZIPを生成して返す
  return await zip.generateAsync({ 
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
}

/**
 * パスから階層構造を構築する補助関数
 */
function ensurePathInHierarchy(
  rootNode: HierarchyNode,
  path: string
): HierarchyNode {
  // パスがファイルを指していない場合はrootNodeを返す
  if (!path.endsWith('.envelope')) {
    return rootNode;
  }
  
  const parts = path.split('/');
  let currentNode = rootNode;
  
  // 最後の要素はファイル名なので別処理
  const fileName = parts.pop() || '';
  
  // ファイル名から.envelopeを削除してサニタイズ
  const fileNameWithoutExtension = fileName.substring(0, fileName.length - 9);
  const safeName = sanitizeFileName(fileNameWithoutExtension);
  
  // フォルダパスの各部分を処理
  for (const part of parts) {
    if (!part) continue; // 空の部分をスキップ
    
    // フォルダノードを探すか作成
    if (!currentNode.children) {
      currentNode.children = [];
    }
    
    const sanitizedPart = sanitizeFileName(part);
    let folderNode = currentNode.children.find(
      child => child.isFolder && sanitizeFileName(child.name) === sanitizedPart
    );
    
    if (!folderNode) {
      folderNode = {
        name: part,
        isFolder: true,
        children: []
      };
      currentNode.children.push(folderNode);
    }
    
    currentNode = folderNode;
  }
  
  // ファイルノードを作成（Bookは後で設定）
  if (!currentNode.children) {
    currentNode.children = [];
  }
  
  let fileNode = currentNode.children.find(
    child => !child.isFolder && sanitizeFileName(child.name) === safeName
  );
  
  if (!fileNode) {
    fileNode = {
      name: fileNameWithoutExtension,
      isFolder: false
    };
    currentNode.children.push(fileNode);
  }
  
  return fileNode;
}

/**
 * ZIPから階層構造を読み込む関数
 */
export async function readHierarchicalEnvelopeZip(
  blob: Blob, 
  progress: (n: number) => void
): Promise<HierarchyNode> {
  const zip = await JSZip.loadAsync(blob);
  const rootNode: HierarchyNode = {
    name: '',  // 空の名前を使用して余計な階層を作らないようにする
    isFolder: true,
    children: []
  };
  
  // 全てのファイルを収集
  const files = Object.keys(zip.files).filter(
    path => !zip.files[path].dir && path.endsWith('.envelope')
  );
  
  let processedCount = 0;
  const totalFiles = files.length;
  
  // 各ファイルを処理
  for (const filePath of files) {
    // 階層構造にノードを作成
    const fileNode = ensurePathInHierarchy(rootNode, filePath);
    
    // ZIPからファイルを読み込み
    const envelopeBlob = await zip.files[filePath].async('blob');
    
    // Bookオブジェクトに変換
    const book = await readEnvelope(envelopeBlob, () => {});
    fileNode.book = book;
    
    // 進捗を更新
    processedCount++;
    progress(processedCount / totalFiles);
  }
  
  return rootNode;
}

/**
 * 平坦化された階層構造をBookの配列として取得
 */
export function getBooksFromHierarchy(node: HierarchyNode): Book[] {
  const books: Book[] = [];
  
  if (!node.isFolder && node.book) {
    books.push(node.book);
  }
  
  if (node.children) {
    for (const child of node.children) {
      books.push(...getBooksFromHierarchy(child));
    }
  }
  
  return books;
}

/**
 * 階層の深さを取得
 */
export function getHierarchyDepth(node: HierarchyNode): number {
  if (!node.children || node.children.length === 0) {
    return 0;
  }
  
  let maxChildDepth = 0;
  for (const child of node.children) {
    const childDepth = getHierarchyDepth(child);
    if (childDepth > maxChildDepth) {
      maxChildDepth = childDepth;
    }
  }
  
  return maxChildDepth + 1;
}