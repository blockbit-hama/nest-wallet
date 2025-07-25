import React from 'react';
import { cn } from '@/lib/utils/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  background?: 'default' | 'gradient';
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  padding = 'md',
  background = 'default'
}) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const backgroundClasses = {
    default: 'bg-[#23242A]',
    gradient: 'bg-gradient-to-br from-[#23242A] to-[#1B1C22]'
  };
  
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-800',
        paddingClasses[padding],
        backgroundClasses[background],
        className
      )}
    >
      {children}
    </div>
  );
}; 