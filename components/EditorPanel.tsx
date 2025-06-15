import React, { useState, useEffect } from 'react';
import { FileItem } from '../types';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs2015 } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { getFileIcon } from '../constants';
import { FiX, FiEdit2, FiSave, FiXCircle } from 'react-icons/fi';

interface EditorPanelProps {
  openFiles: FileItem[];
  selectedFile: FileItem | null;
  onSelectFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
  onFileContentChange: (fileId: string, newContent: string) => void;
}

const getLanguageFromFileName = (fullPath: string | undefined): string | undefined => {
  if (!fullPath) return undefined;
  const fileName = fullPath.split('/').pop() || '';
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'js': case 'jsx': return 'jsx';
    case 'ts': case 'tsx': return 'tsx';
    case 'json': return 'json';
    case 'css': return 'css';
    case 'html': return 'html';
    case 'md': return 'markdown';
    case 'py': return 'python';
    case 'java': return 'java';
    case 'c': case 'cpp': return 'cpp';
    case 'cs': return 'csharp';
    case 'go': return 'go';
    case 'php': return 'php';
    case 'rb': return 'ruby';
    case 'rs': return 'rust';
    case 'swift': return 'swift';
    case 'kt': return 'kotlin';
    case 'sh': return 'bash';
    default: return 'plaintext';
  }
};

export const EditorPanel: React.FC<EditorPanelProps> = ({
  openFiles,
  selectedFile,
  onSelectFile,
  onCloseTab,
  onFileContentChange
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const language = getLanguageFromFileName(selectedFile?.name);

  useEffect(() => {
    // When the selected file changes, turn off editing mode
    setIsEditing(false);
    // And sync the edited content state
    setEditedContent(selectedFile?.content || '');
  }, [selectedFile]);

  const handleSave = () => {
    if (selectedFile) {
      onFileContentChange(selectedFile.id, editedContent);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(selectedFile?.content || '');
    setIsEditing(false);
  };

  return (
    <div className="h-full bg-[#171717] text-neutral-300 flex flex-col overflow-hidden">
        {/* Tab Bar */}
        <div className="flex-shrink-0 bg-[#171717] border-b border-[#1F1F1F] h-[41px] flex items-center justify-between">
            <div className="flex items-center flex-grow min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800">
                {openFiles.map((file) => {
                const baseName = file.name.split('/').pop() || file.name;
                return (
                    <button
                    key={file.id}
                    onClick={() => onSelectFile(file.id)}
                    title={file.name}
                    aria-current={selectedFile?.id === file.id ? "page" : undefined}
                    className={`inline-flex items-center px-3 h-full text-sm border-r border-[#1F1F1F] last:border-r-0 transition-colors duration-150 ease-in-out focus:outline-none relative group
                        ${selectedFile?.id === file.id
                        ? 'text-sky-400 font-medium ring-1 ring-sky-400 z-10'
                        : 'text-neutral-400'
                        }`}
                    >
                    {getFileIcon(file.name, file.type, "w-4 h-4 mr-1.5 flex-shrink-0")}
                    <span className="truncate max-w-[150px]">{baseName}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); onCloseTab(file.id); }}
                        aria-label={`Close tab ${baseName}`}
                        className={`ml-2 p-0.5 rounded-full hover:bg-[#404040] text-neutral-500 hover:text-neutral-100 focus:outline-none
                        ${selectedFile?.id === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                    >
                        <FiX className="w-3.5 h-3.5" />
                    </button>
                    </button>
                )
                })}
                {openFiles.length === 0 && (
                    <div className="px-3 py-2 text-sm text-neutral-500 italic">No files open.</div>
                )}
            </div>
            {/* Edit/Save Controls */}
            {selectedFile && (
                 <div className="flex items-center space-x-2 px-3 flex-shrink-0">
                    {isEditing ? (
                        <>
                            <button onClick={handleSave} title="Save Changes" className="flex items-center p-1.5 rounded-md text-green-400 hover:bg-[#3a3a3a] hover:text-green-300">
                                <FiSave className="w-4 h-4 mr-1" /> Save
                            </button>
                            <button onClick={handleCancel} title="Cancel" className="flex items-center p-1.5 rounded-md text-red-400 hover:bg-[#3a3a3a] hover:text-red-300">
                                <FiXCircle className="w-4 h-4" />
                            </button>
                        </>
                    ) : (
                        <button onClick={() => setIsEditing(true)} title="Edit File" className="flex items-center p-1.5 rounded-md text-neutral-400 hover:bg-[#3a3a3a] hover:text-neutral-100">
                            <FiEdit2 className="w-4 h-4 mr-1" /> Edit
                        </button>
                    )}
                 </div>
            )}
        </div>

      {/* Editor/Textarea View */}
      <div className="flex-grow overflow-auto">
        {selectedFile ? (
            isEditing ? (
                <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-full bg-[#171717] text-neutral-200 p-4 focus:outline-none resize-none font-mono text-sm leading-relaxed"
                    spellCheck="false"
                />
            ) : (
                <SyntaxHighlighter
                    language={language}
                    style={vs2015}
                    showLineNumbers
                    wrapLines
                    lineNumberStyle={{ color: '#858585', minWidth: '2.5em', userSelect: 'none', fontSize: '0.8rem' }}
                    customStyle={{ backgroundColor: '#171717', padding: '1rem', margin: '0', height: '100%', overflowY: 'auto', fontSize: '0.875rem', lineHeight: '1.625' }}
                    codeTagProps={{ style: { fontFamily: 'inherit' } }}
                >
                    {selectedFile.content}
                </SyntaxHighlighter>
            )
        ) : (
          <div className="flex items-center justify-center h-full p-4">
            <p className="text-neutral-500 text-center">
              {openFiles.length > 0 ? "Select an open file tab to view its content." : "No files open. Select one from the explorer or ask the AI to create something!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};