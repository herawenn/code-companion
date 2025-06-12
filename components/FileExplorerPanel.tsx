
import React, { useState, useRef, useEffect, KeyboardEvent, useCallback } from 'react';
import { FileItem, ExpandedFoldersState } from '../types';
import { FiMoreVertical, FiX, FiUpload, FiCheck, FiSlash, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import { AiOutlineFileAdd, AiOutlineFolderAdd } from 'react-icons/ai';
import { getFileIcon } from '../constants';

const EXPANDED_FOLDERS_KEY = 'aiCodingAssistantExpandedFolders_v1';

interface FileExplorerPanelProps {
  files: FileItem[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onAddFile: () => void;
  onAddFolder: () => void;
  onRenameFile: (fileId: string, newFullPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onToggleVisibility: () => void;
  onUploadFile: () => void;
}

export const FileExplorerPanel: React.FC<FileExplorerPanelProps> = ({
  files, selectedFileId, onSelectFile,
  onAddFile, onAddFolder, onRenameFile, onDeleteFile,
  onToggleVisibility, onUploadFile
}) => {
  const [activeContextMenu, setActiveContextMenu] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState<string>('');
  const [expandedFolders, setExpandedFolders] = useState<ExpandedFoldersState>({});
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedExpandedFoldersRaw = localStorage.getItem(EXPANDED_FOLDERS_KEY);
    if (savedExpandedFoldersRaw) {
      try {
        const parsedState = JSON.parse(savedExpandedFoldersRaw);
        if (typeof parsedState === 'object' && parsedState !== null) {
          setExpandedFolders(parsedState);
        }
      } catch (e) {
        // Silently fail or log to app console if necessary
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(EXPANDED_FOLDERS_KEY, JSON.stringify(expandedFolders));
  }, [expandedFolders]);

  const toggleFolderExpansion = (folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const isItemVisible = useCallback((item: FileItem, currentExpandedFolders: ExpandedFoldersState, allFileItems: FileItem[]): boolean => {
    if (item.name.indexOf('/') === -1) return true;

    const pathSegments = item.name.split('/');
    let currentParentPath = '';
    for (let i = 0; i < pathSegments.length - 1; i++) {
        currentParentPath = currentParentPath ? `${currentParentPath}/${pathSegments[i]}` : pathSegments[i];
        const parentFolder = allFileItems.find(f => f.name === currentParentPath && f.type === 'folder');
        if (parentFolder && !currentExpandedFolders[parentFolder.id]) {
            return false;
        }
    }
    return true;
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setActiveContextMenu(null);
      }
      if (editingItemId && inputRef.current && !inputRef.current.contains(event.target as Node)) {
        if (!contextMenuRef.current || !contextMenuRef.current.contains(event.target as Node)) {
            const targetElement = event.target as HTMLElement;
            if(!targetElement.closest('.editing-controls')) {
                 handleConfirmRename(editingItemId);
            }
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [editingItemId]);

  useEffect(() => {
    if (editingItemId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingItemId]);

  const handleToggleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setActiveContextMenu(prev => (prev === fileId ? null : fileId));
  };

  const startRename = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    setEditingItemId(fileId);
    setEditingItemName(file.name.split('/').pop() || '');
    setActiveContextMenu(null);
  };

  const handleConfirmRename = (fileId: string | null) => {
    if (!fileId) {
        handleCancelRename();
        return;
    }
    const oldFile = files.find(f => f.id === fileId);
    if (!oldFile || !editingItemName.trim()) {
      handleCancelRename();
      return;
    }

    const trimmedNewName = editingItemName.trim();
    if (trimmedNewName.includes('/')) {
        alert("New name cannot contain slashes for inline editing.");
        inputRef.current?.focus();
        return;
    }

    const oldPathParts = oldFile.name.split('/');
    const basePath = oldPathParts.slice(0, -1).join('/');
    const newFullPath = basePath ? `${basePath}/${trimmedNewName}` : trimmedNewName;

    if (newFullPath !== oldFile.name) {
      onRenameFile(fileId, newFullPath);
    }
    setEditingItemId(null);
    setEditingItemName('');
  };

  const handleCancelRename = () => {
    setEditingItemId(null);
    setEditingItemName('');
  };

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>, fileId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirmRename(fileId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const handleDelete = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    if (confirm(`Are you sure you want to delete ${file.name}? ${file.type === 'folder' ? 'This will delete all its contents.' : ''}`)) {
      onDeleteFile(fileId);
    }
    setActiveContextMenu(null);
  };

  const sortedFiles = [...files].sort((a, b) => {
    const aParentPath = a.name.substring(0, a.name.lastIndexOf('/'));
    const bParentPath = b.name.substring(0, b.name.lastIndexOf('/'));

    if (aParentPath === bParentPath) {
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;
      return (a.name.split('/').pop() || a.name).localeCompare(b.name.split('/').pop() || b.name);
    }
    return a.name.localeCompare(b.name);
  });

  const visibleFiles = sortedFiles.filter(file => isItemVisible(file, expandedFolders, files));


  return (
    <div className="h-full bg-[#171717] text-neutral-300 flex flex-col">
      <div className="flex justify-between items-center p-2 bg-[#171717] border-b border-[#1F1F1F] h-[41px]">
        <div>
          <button onClick={onToggleVisibility} title="Close Explorer" className="text-neutral-400 hover:text-neutral-100 p-1 rounded focus:outline-none">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="flex space-x-1">
          <button onClick={onUploadFile} title="Upload File(s)" className="text-neutral-400 hover:text-neutral-100 p-1 rounded focus:outline-none">
            <FiUpload className="w-5 h-5" />
          </button>
          <button onClick={onAddFile} title="New File" className="text-neutral-400 hover:text-neutral-100 p-1 rounded focus:outline-none">
            <AiOutlineFileAdd className="w-5 h-5" />
          </button>
          <button onClick={onAddFolder} title="New Folder" className="text-neutral-400 hover:text-neutral-100 p-1 rounded focus:outline-none">
            <AiOutlineFolderAdd className="w-5 h-5" />
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="flex-grow flex items-center justify-center p-4">
          <p className="text-neutral-500 text-sm">No files or folders yet. <br/>Ask the AI to create some!</p>
        </div>
      ) : (
        <ul className="space-y-0.5 overflow-y-auto flex-grow p-1">
          {visibleFiles.map((file) => {
            const depth = file.name.split('/').length -1;
            const isFile = file.type === 'file';
            const isFolder = file.type === 'folder';
            const baseName = file.name.split('/').pop() || file.name;
            const isExpanded = isFolder && expandedFolders[file.id];

            return (
            <li key={file.id} className="relative group/item">
              <div
                onClick={(e) => {
                  if(editingItemId !== file.id) {
                    if (isFile) onSelectFile(file.id);
                    else if (isFolder) toggleFolderExpansion(file.id, e);
                  }
                }}
                role={isFile ? "button" : (isFolder ? "button" : "listitem")}
                tabIndex={isFile || isFolder ? 0 : -1}
                onKeyDown={(e) => {
                    if(e.key === 'Enter' && editingItemId !== file.id) {
                        if (isFile) onSelectFile(file.id);
                        else if (isFolder) toggleFolderExpansion(file.id);
                    }
                }}
                aria-current={selectedFileId === file.id && isFile ? "page" : undefined}
                aria-expanded={isFolder ? isExpanded : undefined}
                title={file.name}
                className={`w-full text-left py-1.5 rounded-md flex items-center space-x-0 transition-colors duration-150 ease-in-out focus:outline-none
                  ${selectedFileId === file.id && isFile
                    ? 'bg-[#2A2D2E] text-neutral-100 font-medium'
                    : 'hover:bg-[#262626] text-neutral-300'
                  } ${isFolder && editingItemId !== file.id ? 'cursor-pointer hover:bg-[#262626] font-medium text-neutral-200' : ''}
                  ${editingItemId === file.id ? 'bg-[#3A3D3E] ring-1 ring-sky-500' : ''}
                  `}
                  style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
              >
                {isFolder && (
                    <button
                        onClick={(e) => toggleFolderExpansion(file.id, e)}
                        className="mr-1 p-0.5 rounded text-neutral-400 hover:text-neutral-100 focus:outline-none focus:bg-neutral-600"
                        aria-label={isExpanded ? `Collapse ${baseName}` : `Expand ${baseName}`}
                    >
                        {isExpanded ? <FiChevronDown className="w-3.5 h-3.5 folder-chevron" /> : <FiChevronRight className="w-3.5 h-3.5 folder-chevron" />}
                    </button>
                )}
                {!isFolder && <span className="w-[18px] mr-1 flex-shrink-0"></span>}

                {getFileIcon(file.name, file.type, `w-4 h-4 ${isFolder ? 'mr-1' : 'mr-2'} flex-shrink-0`)}

                {editingItemId === file.id ? (
                  <div className="flex-grow flex items-center editing-controls ml-0">
                    <input
                      ref={inputRef}
                      type="text"
                      value={editingItemName}
                      onChange={(e) => setEditingItemName(e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, file.id)}
                      className="flex-grow bg-[#262626] text-sm text-neutral-100 focus:outline-none border border-sky-500 rounded px-1 py-0.5 h-[22px]"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button onClick={(e) => {e.stopPropagation(); handleConfirmRename(file.id);}} className="p-0.5 text-green-400 hover:text-green-300 ml-1 focus:outline-none" title="Confirm rename"><FiCheck /></button>
                    <button onClick={(e) => {e.stopPropagation(); handleCancelRename();}} className="p-0.5 text-red-400 hover:text-red-300 focus:outline-none" title="Cancel rename"><FiSlash /></button>
                  </div>
                ) : (
                  <span className="truncate text-sm flex-grow ml-0">{baseName}</span>
                )}

                {editingItemId !== file.id && (
                  <button
                    onClick={(e) => handleToggleContextMenu(e, file.id)}
                    aria-label={`Actions for ${baseName}`}
                    title={`Actions for ${baseName}`}
                    className="p-0.5 rounded-sm text-neutral-400 hover:bg-[#404040] hover:text-neutral-100 focus:outline-none opacity-0 group-hover/item:opacity-100 transition-opacity ml-auto mr-1"
                  >
                    <FiMoreVertical className="w-4 h-4" />
                  </button>
                )}
              </div>
              {activeContextMenu === file.id && editingItemId !== file.id && (
                <div
                  ref={contextMenuRef}
                  className="absolute right-2 mt-0.5 w-36 bg-[#262626] border border-[#333333] rounded-md shadow-lg z-20 py-1"
                  role="menu"
                >
                  <button
                    onClick={() => startRename(file.id)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-neutral-200 hover:bg-[#404040] hover:text-white focus:outline-none"
                    role="menuitem"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-neutral-200 hover:bg-[#404040] hover:text-white focus:outline-none"
                    role="menuitem"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          )})}
        </ul>
      )}
    </div>
  );
};