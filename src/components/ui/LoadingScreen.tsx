import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { Logo } from '../Logo';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
      <Logo size="large" />
      <LoadingSpinner size="lg" label={message} />
    </div>
  );
}
