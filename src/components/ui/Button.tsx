import React from 'react';
import { cn } from '@/lib/utils/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'error';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}) => {
  const baseClasses = 'font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800';
  
  const variantClasses = {
    primary: 'bg-[#F2A003] text-white hover:bg-[#E09400] focus:ring-[#F2A003]',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500',
    success: 'bg-[#6FCF97] text-white hover:bg-[#27AE60] focus:ring-[#6FCF97]',
    error: 'bg-[#EB5757] text-white hover:bg-[#E74C3C] focus:ring-[#EB5757]'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };
  
  const disabledClasses = 'bg-gray-600 text-gray-400 cursor-not-allowed hover:bg-gray-600';
  
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        (disabled || isLoading) && disabledClasses,
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          로딩 중...
        </div>
      ) : (
        children
      )}
    </button>
  );
}; 