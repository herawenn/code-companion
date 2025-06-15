declare global {
  interface ImageCapture {
    readonly track: MediaStreamTrack;
    getPhotoCapabilities(): Promise<any>;
    grabFrame(): Promise<ImageBitmap>;
    takePhoto(photoSettings?: any): Promise<Blob>;
  }

  interface Window {
    ImageCapture: {
      prototype: ImageCapture;
      new (track: MediaStreamTrack): ImageCapture;
    };
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
  }

  interface DisplayMediaStreamOptions {
    preferCurrentTab?: boolean;
  }

  interface FileSystemHandle {
    readonly kind: 'file' | 'directory';
    readonly name: string;
    isSameEntry(other: FileSystemHandle): Promise<boolean>;
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file';
    getFile(): Promise<File>;
    createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory';
    getDirectoryHandle(name: string, options?: FileSystemGetDirectoryOptions): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: FileSystemGetFileOptions): Promise<FileSystemFileHandle>;
    removeEntry(name: string, options?: FileSystemRemoveOptions): Promise<void>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
    keys(): AsyncIterableIterator<string>;
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
    entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
  }

  interface FileSystemHandlePermissionDescriptor {
    mode?: 'read' | 'readwrite';
  }

  interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean;
  }

  interface FileSystemGetDirectoryOptions {
    create?: boolean;
  }

  interface FileSystemGetFileOptions {
    create?: boolean;
  }

  interface FileSystemRemoveOptions {
    recursive?: boolean;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
  }
}

export type AIFileAction = 'create_file' | 'update_file' | 'delete_file' | 'create_folder';

export interface AIFileOperation {
  action: AIFileAction;
  path: string;
  content?: string;
}

export interface AIResponseMessage {
  explanation: string;
  fileOperations?: AIFileOperation[];
}

export interface ScreenshotContext {
  screenshotDataUrl: string;
  consoleContextForAI: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  checkpoint?: { files: FileItem[] };
  fileOperationsApplied?: AIFileOperation[];
  screenshotDataUrl?: string;
  consoleContextForAI?: string;
  isFixAttempt?: boolean;
  processingTime?: number;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content: string;
  icon?: React.ReactNode;
}

export interface ConsoleMessage {
  id: string;
  type: 'log' | 'info' | 'warn' | 'error' | 'success';
  message: string;
  timestamp: Date;
}

export interface LayoutConfig {
  conversationWidth: number;
  middleSectionGroupWidth: number;
  fileExplorerWidth: number;
  showConversationPanel: boolean;
  showEditorSection: boolean;
  showPreviewPanel: boolean;
  isFileExplorerVisibleInMiddle: boolean;
}

export interface ExpandedFoldersState {
  [folderId: string]: boolean;
}

export interface TutorialStep {
  id: string;
  title: string;
  content: React.ReactNode;
  targetId?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  highlightTarget?: boolean;
  requireVisible?: boolean;
  onBeforeShow?: () => void;
  onAfterShow?: () => void;
}

export interface EditorPanelProps {
  openFiles: FileItem[];
  selectedFile: FileItem | null;
  onSelectFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onFileContentChange: (fileId: string, newContent: string) => void;
}

export interface PreviewPanelProps {
  file: FileItem | null;
  refreshKey?: number;
  pythonExecutionOutput?: { output: string; error: string } | null;
  onExecutePython?: () => void;
}
