'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function TransportCodePage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    fetch(`/api/public/transport/${code.toUpperCase()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Code invalide ou expiré');
        const data = await res.json();
        router.replace(`/transport/${data.envoi_id}`);
      })
      .catch((e) => setError(String(e)));
  }, [code, router]);

  if (error) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'system-ui, sans-serif', padding: 24,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ fontSize: 18, color: '#dc2626', fontWeight: 700, marginBottom: 8 }}>Lien invalide</p>
        <p style={{ fontSize: 14, color: '#6b7280' }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 14, color: '#6b7280' }}>Redirection en cours…</div>
    </div>
  );
}
