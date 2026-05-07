'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

interface SidebarProps {
  siteId: number;
  onSiteChange: (id: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { href: '/outils/centrifugation', label: 'Centrifugation', icon: '⟳' },
  { href: '/outils/transport',      label: 'Transport',       icon: '🚚' },
  { href: '/recherche',             label: 'Recherche',       icon: '⌕' },
];

export default function Sidebar({ siteId, onSiteChange, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === 'admin';

  return (
    <>
      {/* Overlay mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[240px] bg-gray-900 text-white flex flex-col
          transform transition-transform duration-200
          md:relative md:translate-x-0 md:w-[190px] md:shrink-0 md:z-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Header + close button on mobile */}
        <div className="px-4 py-5 border-b border-gray-700 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              CH Épinal
            </span>
            <p className="text-sm font-bold mt-1 text-white">Labo Bio Med</p>
          </div>
          {mobileOpen && (
            <button
              onClick={onMobileClose}
              className="md:hidden text-gray-400 hover:text-white p-1"
              aria-label="Fermer le menu"
            >
              ✕
            </button>
          )}
        </div>

        <nav className="flex-1 py-4">
          <p className="px-4 text-xs text-gray-500 uppercase tracking-wider mb-2">Outils</p>
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-teal-700 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              onClick={onMobileClose}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                pathname.startsWith('/admin')
                  ? 'bg-teal-700 text-white font-medium'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Administration
            </Link>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 mb-2">Site</p>
          <div className="flex flex-col gap-1">
            {[{ id: 1, label: 'Épinal' }, { id: 2, label: 'Remiremont' }, { id: 3, label: 'Neufchâteau' }].map((site) => (
              <button
                key={site.id}
                onClick={() => { onSiteChange(site.id); onMobileClose?.(); }}
                className={`w-full text-left text-sm px-3 py-1.5 rounded transition-colors ${
                  siteId === site.id
                    ? 'bg-teal-600 text-white font-medium'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                {site.label}
              </button>
            ))}
          </div>
        </div>

        {/* Déconnexion */}
        <div className="px-4 py-3 border-t border-gray-700">
          <button
            onClick={() => signOut({ callbackUrl: '/login?disconnected=true' })}
            className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  );
}
