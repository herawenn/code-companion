
import React from 'react';
import { FileItem } from '../types';
import { getFileIcon } from '../constants';
import { FiEyeOff } from 'react-icons/fi';

interface PreviewPanelProps {
  file: FileItem | null;
  refreshKey?: number;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ file, refreshKey }) => {
  let panelContent;
  const fileName = file?.name.split('/').pop();
  const iframeKey = file ? `${file.id}-${refreshKey || 0}` : `no-file-${refreshKey || 0}`;

  if (!file) {
    panelContent = (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <FiEyeOff className="w-12 h-12 mb-3 text-neutral-600"/>
            <p>No file selected for preview.</p>
        </div>
    );
  } else if (file.type === 'folder') {
    panelContent = (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <FiEyeOff className="w-12 h-12 mb-3 text-neutral-600"/>
            <p>Cannot preview a folder.</p>
            <p className="text-xs">Select a file to see its preview.</p>
        </div>
    );
  } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
    panelContent = (
      <iframe
        key={iframeKey}
        srcDoc={file.content}
        title={`Preview: ${fileName}`}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin"
      />
    );
  } else if (['.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.py', '.java', '.c', '.cpp', '.cs', '.go', '.php', '.rb', '.rs', '.swift', '.kt', '.sh', '.xml', '.yaml', '.yml'].some(ext => file.name.endsWith(ext))) {
    panelContent = (
      <pre className="w-full h-full overflow-auto p-3 text-sm text-neutral-200 whitespace-pre-wrap break-all bg-[#171717] scrollbar-thin">
        {file.content}
      </pre>
    );
  } else {
    panelContent = (
        <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <FiEyeOff className="w-12 h-12 mb-3 text-neutral-600"/>
            <p>Preview not available for this file type:</p>
            <p className="text-sm font-medium text-neutral-400 mt-1">{fileName}</p>
        </div>
    );
  }

  return (
    <div className="h-full bg-[#171717] text-neutral-400 flex flex-col">
      <div className="flex-shrink-0 p-2 bg-[#171717] border-b border-[#1F1F1F] h-[41px] flex items-center">
        {file ? (
          <>
            {getFileIcon(file.name, file.type, "w-4 h-4 mr-2 flex-shrink-0")}
            <span className="text-sm text-neutral-200 truncate" title={file.name}>Preview: {fileName}</span>
          </>
        ) : (
          <span className="text-sm text-neutral-400">Preview</span>
        )}
      </div>
      <div className="flex-grow flex flex-col items-stretch justify-stretch overflow-hidden">
        {panelContent}
      </div>
    </div>
  );
};