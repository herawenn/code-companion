
import React from 'react';
import { FileItem } from '../types';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getFileIcon } from '../constants';
import { FiX } from 'react-icons/fi';

interface EditorPanelProps {
  openFiles: FileItem[];
  selectedFile: FileItem | null;
  onSelectFile: (fileId: string) => void;
  onCloseTab: (fileId: string) => void;
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
  onCloseTab
}) => {
  const language = getLanguageFromFileName(selectedFile?.name);

  return (
    <div className="h-full bg-[#171717] text-neutral-300 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 bg-[#171717] border-b border-[#1F1F1F] overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800 h-[41px] flex items-center">
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
                  ? 'bg-[#262626] text-neutral-100 font-medium'
                  : 'text-neutral-400 hover:bg-[#2A2D2E] hover:text-neutral-200'
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

      <div className="flex-grow overflow-auto">
        {selectedFile ? (
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            showLineNumbers
            wrapLines
            lineNumberStyle={{ color: '#858585', minWidth: '2.5em', userSelect: 'none', fontSize: '0.8rem' }}
            customStyle={{ backgroundColor: '#171717', padding: '1rem', margin: '0', height: '100%', overflowY: 'auto', fontSize: '0.875rem', lineHeight: '1.625' }}
            codeTagProps={{ style: { fontFamily: 'inherit' } }}
          >
            {selectedFile.content}
          </SyntaxHighlighter>
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
