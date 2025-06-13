import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Command } from '../types';
import { FiX, FiCommand } from 'react-icons/fi';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, commands }) => {
  const [query, setQuery] = useState('');
  const [filteredCommands, setFilteredCommands] = useState<Command[]>(commands);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery(''); // Reset query when opening
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim() === '') {
      setFilteredCommands(commands);
    } else {
      const lowerQuery = query.toLowerCase();
      setFilteredCommands(
        commands.filter(cmd =>
          cmd.name.toLowerCase().includes(lowerQuery) ||
          (cmd.category && cmd.category.toLowerCase().includes(lowerQuery)) ||
          (cmd.keywords && cmd.keywords.some(kw => kw.toLowerCase().includes(lowerQuery)))
        )
      );
    }
    setSelectedIndex(0); // Reset selection on query change
  }, [query, commands]);

  useEffect(() => {
    if (isOpen && listRef.current && listRef.current.children[selectedIndex]) {
      listRef.current.children[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex, isOpen]);
  
  const handleExecuteCommand = useCallback((command: Command) => {
    command.action();
    onClose();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleExecuteCommand(filteredCommands[selectedIndex]);
      }
    }
  }, [onClose, filteredCommands, selectedIndex, handleExecuteCommand]);

   useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 pt-[15vh] z-50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
      <div ref={paletteRef} className="bg-[#1e1e1e] border border-neutral-700 rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[70vh]">
        <div className="flex items-center p-3 border-b border-neutral-700">
          <FiCommand className="w-5 h-5 mr-3 text-sky-400 flex-shrink-0" />
          <input
            ref={inputRef}
            id="command-palette-title"
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-neutral-100 placeholder-neutral-500 focus:outline-none text-sm"
          />
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-neutral-200" aria-label="Close command palette">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        {filteredCommands.length > 0 ? (
          <ul ref={listRef} className="overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-700/50 py-1">
            {filteredCommands.map((cmd, index) => (
              <li key={cmd.id}>
                <button
                  onClick={() => handleExecuteCommand(cmd)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 py-2.5 flex items-center text-sm transition-colors duration-100 ease-in-out focus:outline-none
                    ${index === selectedIndex ? 'bg-sky-600 text-white' : 'text-neutral-300 hover:bg-neutral-700'}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  {cmd.icon && <span className={`mr-2.5 ${index === selectedIndex ? 'text-white' : 'text-neutral-400'}`}>{React.cloneElement(cmd.icon, { className: 'w-4 h-4' })}</span>}
                  <div className="flex-grow">
                    {cmd.name}
                    {cmd.category && <span className={`ml-2 text-xs opacity-70 ${index === selectedIndex ? 'text-sky-200' : 'text-neutral-500'}`}>({cmd.category})</span>}
                  </div>
                  {cmd.shortcut && <span className={`text-xs opacity-70 ${index === selectedIndex ? 'text-sky-100' : 'text-neutral-500'}`}>{cmd.shortcut}</span>}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-4 text-center text-neutral-500 text-sm">No commands found.</p>
        )}
      </div>
    </div>
  );
};
