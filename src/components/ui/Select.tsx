"use client";
import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  loading?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "선택하세요",
  disabled = false,
  className,
  loading = false
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  // 선택된 옵션 찾기
  const selectedOption = options.find(option => option.value === value);

  // 외부 클릭 감지하여 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={selectRef} className={clsx("relative", className)}>
      {/* Select Trigger */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={clsx(
          "w-full px-4 py-3 text-left bg-[#2A2B31] border border-gray-600 rounded-lg",
          "focus:border-[#F2A003] focus:ring-1 focus:ring-[#F2A003] focus:outline-none",
          "transition-all duration-200",
          {
            "cursor-pointer hover:border-gray-500": !disabled && !loading,
            "cursor-not-allowed opacity-50": disabled || loading,
            "border-[#F2A003]": isOpen,
          }
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full"></div>
                <span className="text-gray-400">로딩 중...</span>
              </div>
            ) : selectedOption ? (
              <>
                {selectedOption.icon && (
                  <span className="flex-shrink-0">{selectedOption.icon}</span>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-white font-medium">{selectedOption.label}</span>
                  {selectedOption.subtitle && (
                    <div className="text-xs text-gray-400">{selectedOption.subtitle}</div>
                  )}
                </div>
              </>
            ) : (
              <span className="text-gray-400">{placeholder}</span>
            )}
          </div>
          <svg
            className={clsx(
              "w-5 h-5 text-gray-400 transition-transform duration-200",
              { "rotate-180": isOpen }
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-[#2A2B31] border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-gray-400 text-center">
              사용 가능한 옵션이 없습니다
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleOptionClick(option.value)}
                className={clsx(
                  "w-full px-4 py-3 text-left hover:bg-[#3A3B41] transition-colors",
                  "flex items-center gap-3",
                  {
                    "bg-[#F2A003]/10 text-[#F2A003]": option.value === value,
                    "text-white": option.value !== value,
                  }
                )}
              >
                {option.icon && (
                  <span className="flex-shrink-0">{option.icon}</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{option.label}</div>
                  {option.subtitle && (
                    <div className="text-xs text-gray-400">{option.subtitle}</div>
                  )}
                </div>
                {option.value === value && (
                  <svg className="w-4 h-4 text-[#F2A003]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}