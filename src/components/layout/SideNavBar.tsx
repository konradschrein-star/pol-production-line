'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';

export function SideNavBar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/broadcasts', label: 'Broadcasts', icon: 'sensors' },
    { href: '/consoles', label: 'Consoles', icon: 'terminal' },
    { href: '/wiki', label: 'Wiki', icon: 'menu_book' },
    { href: '/analytics', label: 'Analytics', icon: 'analytics' },
    { href: '/personas', label: 'Personas', icon: 'group' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ];

  const isActive = (href: string) => pathname?.startsWith(href);

  // Close menu on navigation
  const handleNavClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-surface-container rounded-lg shadow-lg hover:bg-surface-container-high transition-colors"
        aria-label="Toggle menu"
      >
        <Icon name={isMobileMenuOpen ? 'close' : 'menu'} size="md" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 flex flex-col bg-surface-container-lowest border-r border-outline-variant
          md:relative md:translate-x-0
          fixed inset-y-0 left-0 z-40
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
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
            onClick={handleNavClick}
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
          onClick={handleNavClick}
          className="flex items-center gap-3 px-2 py-2 text-[11px] uppercase tracking-wide text-outline hover:text-white transition-colors"
        >
          <Icon name="code" size="sm" />
          API Docs
        </Link>
        <Link
          href="/logs"
          onClick={handleNavClick}
          className="flex items-center gap-3 px-2 py-2 text-[11px] uppercase tracking-wide text-outline hover:text-white transition-colors"
        >
          <Icon name="description" size="sm" />
          System Logs
        </Link>
      </div>
    </aside>
    </>
  );
}

export default SideNavBar;
