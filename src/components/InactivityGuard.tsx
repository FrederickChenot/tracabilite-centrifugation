'use client';

import { useState, useCallback, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useInactivityTimer } from '@/hooks/useInactivityTimer';

export default function InactivityGuard() {
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [warningMinutes, setWarningMinutes] = useState(2);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        const t = parseInt(data.session_timeout_minutes, 10);
        const w = parseInt(data.session_warning_minutes, 10);
        if (!isNaN(t) && t > 0) setTimeoutMinutes(t);
        if (!isNaN(w) && w > 0) setWarningMinutes(w);
      })
      .catch(() => {});
  }, []);

  const handleWarning = useCallback(() => setShowWarning(true), []);
  const handleDismiss = useCallback(() => setShowWarning(false), []);

  const { resetTimer } = useInactivityTimer({
    timeoutMinutes,
    warningMinutes,
    onWarning: handleWarning,
    onDismissWarning: handleDismiss,
  });

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-900">Session sur le point d&apos;expirer</h2>
        </div>
        <p className="text-sm text-gray-600 mb-5">
          Vous allez être déconnecté dans {warningMinutes} minute{warningMinutes > 1 ? 's' : ''} par inactivité.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { resetTimer(); setShowWarning(false); }}
            className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-teal-700 transition-colors"
          >
            Rester connecté
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login?disconnected=true' })}
            className="px-4 py-2.5 rounded-lg text-sm text-gray-600 border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
