"use client";
import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/utils';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  width?: number | string;
  height?: number | string;
  fontSize?: number;
  padding?: string;
  placeholder?: string;
  accentColor?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  width = '100%',
  height = 56,
  fontSize = 20,
  padding = '18px 48px 18px 24px',
  placeholder = '선택',
  accentColor = '#F2A003',
  style,
  className
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const selected = options.find(opt => opt.value === value);

  return (
    <div 
      ref={ref} 
      className={cn("relative", className)}
      style={{ width, ...style }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
        className={cn(
          "select-button",
          open && "open",
          open ? "border-orange-400" : "border-gray-700"
        )}
        style={{ 
          height: typeof height === 'number' ? `${height}px` : height,
          fontSize: `${fontSize}px`,
          padding,
          color: selected ? '#E0DFE4' : '#A0A0B0',
          borderColor: open ? accentColor : '#23242A'
        }}
      >
        <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap align-middle"
              style={{ maxWidth: typeof width === 'number' ? width - 64 : 'calc(100% - 64px)' }}>
          {selected ? selected.label : <span style={{ color: '#A0A0B0' }}>{placeholder}</span>}
        </span>
        <span className="absolute right-5 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M6 9L12 15L18 9" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>
      {open && (
        <div
          role="listbox"
          tabIndex={-1}
          className="dropdown-menu"
          style={{ borderColor: accentColor }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              tabIndex={0}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              onKeyDown={e => { if (e.key === 'Enter') { onChange(opt.value); setOpen(false); }}}
              className={cn(
                "dropdown-option",
                opt.value === value && "selected"
              )}
              style={{ 
                fontSize: `${fontSize + 4}px`,
                height: typeof height === 'number' ? `${Number(height) + 8}px` : '64px',
                color: opt.value === value ? accentColor : '#E0DFE4'
              }}
            >
              <span className="inline-block max-w-full overflow-hidden text-ellipsis whitespace-nowrap"
                    style={{ maxWidth: typeof width === 'number' ? width - 48 : 'calc(100% - 48px)' }}>
                {opt.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};