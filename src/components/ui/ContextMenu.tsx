import React, { useEffect, useRef } from 'react';

/**
 * Context menu component that displays a menu on right-click.
 * 
 * @param x - X position of the menu
 * @param y - Y position of the menu
 * @param onClose - Callback when menu should close
 * @param items - Array of menu items to display
 */
export const ContextMenu: React.FC<{
  x: number;
  y: number;
  onClose: () => void;
  items: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }>;
}> = ({ x, y, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add listeners after a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off-screen
  const [adjustedX, adjustedY] = React.useMemo(() => {
    if (!menuRef.current) return [x, y];
    const rect = menuRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    
    let newX = x;
    let newY = y;
    
    if (x + rect.width > windowWidth) {
      newX = windowWidth - rect.width - 10;
    }
    if (y + rect.height > windowHeight) {
      newY = windowHeight - rect.height - 10;
    }
    
    return [Math.max(10, newX), Math.max(10, newY)];
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[160px]"
      style={{
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
      }}
      onContextMenu={(e) => e.preventDefault()} // Prevent native context menu on our menu
    >
      {items.map((item, index) => (
        <button
          key={index}
          onClick={() => {
            item.onClick();
            onClose();
          }}
          disabled={item.disabled}
          className={`w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-indigo-50 hover:text-indigo-700 transition-colors ${
            item.disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

