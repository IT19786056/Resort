import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton = ({ className = '' }: SkeletonProps) => {
  return (
    <div 
      className={`animate-pulse bg-natural-accent/50 rounded-2xl ${className}`}
      style={{ animationDuration: '1.5s' }}
    />
  );
};
