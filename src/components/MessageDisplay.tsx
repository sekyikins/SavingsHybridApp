import React, { useEffect } from 'react';

interface MessageDisplayProps {
  message: string | null;
  type: 'success' | 'error';
  onClear: () => void;
}

export function MessageDisplay({ message, type, onClear }: MessageDisplayProps) {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(onClear, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClear]);

  if (!message) return null;

  return (
    <div className={`rounded-lg px-4 py-3 mb-4 ${
      type === 'success' 
        ? 'bg-green-100 border border-green-400 text-green-700' 
        : 'bg-red-100 border border-red-400 text-red-700'
    }`}>
      {message}
    </div>
  );
}
