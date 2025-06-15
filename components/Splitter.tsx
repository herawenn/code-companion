
import React from 'react';

interface SplitterProps {
  onDrag: (deltaX: number) => void;
  className?: string;
  ariaLabel: string;
}

export const Splitter: React.FC<SplitterProps> = ({ onDrag, className, ariaLabel }) => {
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    let lastX = startX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - lastX;
      if (deltaX !== 0) {
        onDrag(deltaX);
      }
      lastX = moveEvent.clientX;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  return (
    <div
      className={`w-1 h-full bg-neutral-700 hover:bg-neutral-500 active:bg-neutral-400 cursor-col-resize select-none ${className}`}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      tabIndex={0}
    />
  );
};
