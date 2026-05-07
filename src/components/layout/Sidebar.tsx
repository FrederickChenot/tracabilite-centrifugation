'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  siteId: number;
  onSiteChange: (id: number) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const navItems = [
  { href: '/outils/centrifugation', label: 'Centrifugation', icon: '⟳' },
  { href: '/recherche',              label: 'Recherche',       icon: '⌕' },
];

export default function Sidebar({ siteId, onSiteChange, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

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
      </aside>
    </>
  );
}
