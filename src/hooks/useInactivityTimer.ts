'use client';

import { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'next-auth/react';

interface Options {
  timeoutMinutes: number;
  warningMinutes: number;
  onWarning: () => void;
  onDismissWarning: () => void;
}

export function useInactivityTimer({ timeoutMinutes, warningMinutes, onWarning, onDismissWarning }: Options) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onWarningRef = useRef(onWarning);
  const onDismissRef = useRef(onDismissWarning);

  useEffect(() => { onWarningRef.current = onWarning; }, [onWarning]);
  useEffect(() => { onDismissRef.current = onDismissWarning; }, [onDismissWarning]);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    onDismissRef.current();

    const warningMs = Math.max((timeoutMinutes - warningMinutes) * 60 * 1000, 0);
    const timeoutMs = timeoutMinutes * 60 * 1000;

    warningRef.current = setTimeout(() => {
      onWarningRef.current();
    }, warningMs);

    timeoutRef.current = setTimeout(() => {
      signOut({ callbackUrl: '/login?disconnected=true' });
    }, timeoutMs);
  }, [timeoutMinutes, warningMinutes]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const;
    const handleActivity = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer]);

  return { resetTimer };
}
