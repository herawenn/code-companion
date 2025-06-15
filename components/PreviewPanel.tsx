import React from 'react';
import { FileItem } from '../types';
import { getFileIcon, LoadingSpinner } from '../constants'; // Import LoadingSpinner
import { FiEyeOff } from 'react-icons/fi';

interface PreviewPanelProps {
  file: FileItem | null;
  refreshKey?: number;
  pythonExecutionOutput?: { output: string; error: string } | null;
  onExecutePython?: () => void;
  isLoading?: boolean; // Added isLoading prop
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ file, refreshKey, pythonExecutionOutput, onExecutePython, isLoading }) => {
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
  } else if (file.name.endsWith('.py')) {
    panelContent = (
      <div className="flex flex-col h-full overflow-hidden">
        <pre className="flex-grow p-3 text-sm text-neutral-200 whitespace-pre-wrap break-all bg-[#171717] scrollbar-thin">
          {file.content}
        </pre>
        {(pythonExecutionOutput || isLoading) && (
            <div className="flex-shrink-0 mt-2 p-3 bg-[#262626] border-t border-[#1F1F1F] text-xs text-neutral-300 overflow-y-auto max-h-[150px] scrollbar-thin" id="python-output-area">
                <h4 className="font-semibold text-sky-400 mb-1">Execution Output:</h4>
                {isLoading ? ( // Show spinner if loading
                    <div className="flex items-center justify-center py-4">
                        <LoadingSpinner className="w-5 h-5 mr-2" />
                        <span>Executing... please wait.</span>
                    </div>
                ) : ( // Else show output/error
                    <>
                        {pythonExecutionOutput?.output && <pre className="text-green-300 whitespace-pre-wrap">{pythonExecutionOutput.output}</pre>}
                        {pythonExecutionOutput?.error && <pre className="text-red-300 whitespace-pre-wrap">{pythonExecutionOutput.error}</pre>}
                        {!pythonExecutionOutput?.output && !pythonExecutionOutput?.error && <p className="text-neutral-500">No output.</p>}
                    </>
                )}
            </div>
        )}
      </div>
    );
  } else if (['.txt', '.md', '.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.java', '.c', '.cpp', '.cs', '.go', '.php', '.rb', '.rs', '.swift', '.kt', '.sh', '.xml', '.yaml', '.yml'].some(ext => file.name.endsWith(ext))) {
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
      <div className="flex-shrink-0 p-2 bg-[#171717] border-b border-[#1F1F1F] h-[41px] flex items-center justify-between">
        <div className="flex items-center">
          {file ? (
            <>
              {getFileIcon(file.name, file.type, "w-4 h-4 mr-2 flex-shrink-0")}
              <span className="text-sm text-neutral-200 truncate" title={file.name}>Preview: {fileName}</span>
            </>
          ) : (
            <span className="text-sm text-neutral-400">Preview</span>
          )}
        </div>
        {file?.name.endsWith('.py') && onExecutePython && (
            <button
                onClick={onExecutePython}
                title="Execute Python Script"
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3 py-1 rounded-md"
                id="execute-python-button"
            >
                Execute
            </button>
        )}
      </div>
      <div className="flex-grow flex flex-col items-stretch justify-stretch overflow-hidden">
        {panelContent}
      </div>
    </div>
  );
};