
import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiChevronUp, FiInfo, FiAlertTriangle, FiCheckCircle, FiTrash2, FiTool, FiXCircle } from 'react-icons/fi';
import { ConsoleMessage } from '../types';

const MAX_CONSOLE_HEIGHT = 300;
const MIN_CONSOLE_HEIGHT = 40;

interface ConsolePanelProps {
  consoleLogs: ConsoleMessage[];
  onClearConsole: () => void;
  onFixErrorWithAI: (errorLog: ConsoleMessage) => void;
}

const getLogIcon = (type: ConsoleMessage['type'], className: string = "w-4 h-4 mr-2 flex-shrink-0") => {
  switch (type) {
    case 'error':
      return <FiXCircle className={`${className} text-red-500`} />;
    case 'warn':
      return <FiAlertTriangle className={`${className} text-yellow-500`} />;
    case 'success':
      return <FiCheckCircle className={`${className} text-green-500`} />;
    case 'info':
    case 'log':
    default:
      return <FiInfo className={`${className} text-sky-500`} />;
  }
};

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ consoleLogs, onClearConsole, onFixErrorWithAI }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const problemCount = consoleLogs.filter(log => log.type === 'error' || log.type === 'warn').length;

  useEffect(() => {
    if (isExpanded && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [consoleLogs, isExpanded]);

  return (
    <div
      className="bg-[#1e1e1e] border-t border-[#1F1F1F] text-neutral-300 flex flex-col transition-all duration-300 ease-in-out"
      style={{ height: isExpanded ? MAX_CONSOLE_HEIGHT : MIN_CONSOLE_HEIGHT }}
    >
      <header className="flex items-center justify-between p-2 h-[40px] bg-[#171717] border-b border-[#1F1F1F] flex-shrink-0 cursor-pointer select-none" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          <button
            className="p-1 text-neutral-400 hover:text-neutral-100 rounded-md mr-2"
            aria-label={isExpanded ? "Collapse Console" : "Expand Console"}
            title={isExpanded ? "Collapse Console" : "Expand Console"}
          >
            {isExpanded ? <FiChevronDown className="w-5 h-5" /> : <FiChevronUp className="w-5 h-5" />}
          </button>
          <span className="font-semibold text-sm">Console</span>
          {problemCount > 0 && (
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
              consoleLogs.some(l => l.type === 'error') ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
            }`}>
              {problemCount} Problem{problemCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center">
          <button
            onClick={(e) => { e.stopPropagation(); onClearConsole(); }}
            className="p-1 text-neutral-400 hover:text-neutral-100 rounded-md"
            aria-label="Clear Console"
            title="Clear Console"
            disabled={consoleLogs.length <= 1 && consoleLogs[0]?.message.includes("cleared")}
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {isExpanded && (
        <div ref={logsContainerRef} className="flex-grow p-2 space-y-1.5 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-700 text-xs">
          {consoleLogs.map((log) => (
            <div key={log.id} className={`flex items-start p-1 rounded-sm ${
                log.type === 'error' ? 'bg-red-900/30 text-red-300'
              : log.type === 'warn' ? 'bg-yellow-900/30 text-yellow-300'
              : 'text-neutral-400'
            }`}>
              {getLogIcon(log.type, "w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0")}
              <span className="mr-2 text-neutral-500 flex-shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
              <pre className="whitespace-pre-wrap break-all flex-grow font-mono">{log.message}</pre>
              {log.type === 'error' && (
                <button
                  onClick={() => onFixErrorWithAI(log)}
                  title="Attempt to fix this error with AI"
                  className="ml-2 p-1 bg-sky-600 hover:bg-sky-500 text-white rounded-md text-xs flex items-center flex-shrink-0"
                >
                  <FiTool className="w-3 h-3 mr-1" />
                  Fix with AI
                </button>
              )}
            </div>
          ))}
          {consoleLogs.length === 0 && <p className="text-neutral-500">No logs yet.</p>}
        </div>
      )}
    </div>
  );
};