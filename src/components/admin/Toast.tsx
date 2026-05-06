'use client';

import { useState } from 'react';

export interface ToastState {
  message: string;
  type: 'success' | 'error';
  key: number;
}

interface ToastProps {
  toast: ToastState | null;
}

export default function Toast({ toast }: ToastProps) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
        toast.type === 'success'
          ? 'bg-teal-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      <span>{toast.type === 'success' ? '✓' : '✕'}</span>
      {toast.message}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    const key = Date.now();
    setToast({ message, type, key });
    setTimeout(() => setToast(null), 3500);
  }

  return { toast, showToast };
}
