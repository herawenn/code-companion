
import React from 'react';
import { FileItem, Message } from './types';
import { FiFolder } from 'react-icons/fi';
import { VscJson, VscMarkdown } from 'react-icons/vsc';
import { AiOutlineFile, AiOutlineHtml5 } from 'react-icons/ai';
import { DiCss3, DiJavascript1, DiReact, DiRuby, DiPython, DiJava, DiGo, DiPhp } from 'react-icons/di';
import { SiTypescript, SiRust, SiKotlin, SiSwift, SiCplusplus, SiSharp } from 'react-icons/si';

const generateUniqueId = (prefix: string) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

export const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin h-5 w-5 text-white ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export const getFileIcon = (fullPath: string, type: 'file' | 'folder', className: string = "w-4 h-4 mr-2 flex-shrink-0") => {
  if (type === 'folder') return <FiFolder className={`${className} text-sky-400`} aria-label="Folder" />;

  const fileName = fullPath.split('/').pop() || '';
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'tsx':
      return <DiReact className={`${className} text-sky-400`} aria-label="TSX React file" />;
    case 'jsx':
      return <DiReact className={`${className} text-sky-500`} aria-label="JSX React file" />;
    case 'js':
       return <DiJavascript1 className={`${className} text-yellow-400`} aria-label="JavaScript file" />;
    case 'ts':
      return <SiTypescript className={`${className} text-blue-400`} aria-label="TypeScript file" />;
    case 'html':
      return <AiOutlineHtml5 className={`${className} text-orange-500`} aria-label="HTML file" />;
    case 'css':
      return <DiCss3 className={`${className} text-blue-500`} aria-label="CSS file" />;
    case 'json':
      return <VscJson className={`${className} text-yellow-500`} aria-label="JSON file" />;
    case 'md':
      return <VscMarkdown className={`${className} text-neutral-400`} aria-label="Markdown file" />;
    case 'txt':
      return <AiOutlineFile className={`${className} text-neutral-400`} aria-label="Text file" />;
    case 'py':
      return <DiPython className={`${className} text-green-500`} aria-label="Python file" />;
    case 'java':
      return <DiJava className={`${className} text-red-500`} aria-label="Java file" />;
    case 'rb':
      return <DiRuby className={`${className} text-red-600`} aria-label="Ruby file" />;
    case 'go':
      return <DiGo className={`${className} text-teal-500`} aria-label="Go file" />;
    case 'php':
      return <DiPhp className={`${className} text-purple-500`} aria-label="PHP file" />;
    case 'c':
    case 'cpp':
      return <SiCplusplus className={`${className} text-blue-600`} aria-label="C/C++ file" />;
    case 'cs':
      return <SiSharp className={`${className} text-purple-600`} aria-label="C# file" />;
    case 'rs':
      return <SiRust className={`${className} text-orange-600`} aria-label="Rust file" />;
    case 'swift':
      return <SiSwift className={`${className} text-orange-500`} aria-label="Swift file" />;
    case 'kt':
      return <SiKotlin className={`${className} text-purple-400`} aria-label="Kotlin file" />;
    case 'sh':
      return <AiOutlineFile className={`${className} text-green-400`} aria-label="Shell script" />;
    default:
      return <AiOutlineFile className={`${className} text-neutral-400`} aria-label="File" />;
  }
};

export const initialFiles: FileItem[] = [];

export const initialSelectedFileId: string | null = null;

export const initialMessages: Message[] = [
  {
    id: generateUniqueId('assistant'),
    sender: 'assistant',
    text: `\n         Welcome to Code Companion\n\n\t\t\t\t\t\t       🤝\n\n      What would you like to build today?
    `,
    timestamp: new Date(),
  }
];