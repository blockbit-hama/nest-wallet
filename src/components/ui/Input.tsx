import React from 'react';
import { cn } from '@/lib/utils/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className,
  ...props
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-white text-sm font-semibold">
          {label}
        </label>
      )}
      <input
        className={cn(
          'w-full p-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:border-[#F2A003] focus:outline-none transition-colors',
          error && 'border-[#EB5757] focus:border-[#EB5757]',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-[#EB5757] text-sm">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-gray-400 text-sm">{helperText}</p>
      )}
    </div>
  );
}; 