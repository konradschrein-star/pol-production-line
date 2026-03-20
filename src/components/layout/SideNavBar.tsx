'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';

export function SideNavBar() {
  const pathname = usePathname();

  const navLinks = [
    { href: '/broadcasts', label: 'Broadcasts', icon: 'sensors' },
    { href: '/wiki', label: 'Wiki', icon: 'menu_book' },
    { href: '/analytics', label: 'Analytics', icon: 'analytics' },
    { href: '/personas', label: 'Personas', icon: 'group' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  return (
    <aside className="w-64 hidden md:flex flex-col bg-surface-container-lowest border-r border-outline-variant">
      {/* Operator badge */}
      <div className="p-6 border-b border-outline-variant">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
          <div>
            <p className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
              OPERATOR_01
            </p>
            <p className="font-mono text-[10px] text-outline">
              ACTIVE SESSION
            </p>
          </div>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 py-4">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`
              flex items-center gap-3 px-6 py-3
              font-bold uppercase text-[12px] tracking-wider
              transition-colors
              ${
                isActive(link.href)
                  ? 'bg-surface-bright text-white'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-white'
              }
            `}
          >
            <Icon name={link.icon} size="md" />
            {link.label}
          </Link>
        ))}
      </nav>

      {/* Footer links */}
      <div className="p-4 border-t border-outline-variant space-y-2">
        <Link
          href="/terminal"
          className="flex items-center gap-3 px-2 py-2 text-[11px] uppercase tracking-wide text-outline hover:text-white transition-colors"
        >
          <Icon name="code" size="sm" />
          API Docs
        </Link>
        <Link
          href="/logs"
          className="flex items-center gap-3 px-2 py-2 text-[11px] uppercase tracking-wide text-outline hover:text-white transition-colors"
        >
          <Icon name="description" size="sm" />
          System Logs
        </Link>
      </div>
    </aside>
  );
}

export default SideNavBar;
