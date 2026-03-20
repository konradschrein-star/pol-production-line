'use client';

import Icon from '@/components/ui/Icon';

export function TopNavBar() {
  return (
    <header className="sticky top-0 z-40 h-16 bg-surface border-b border-outline-variant flex items-center justify-between px-6">
      {/* Logo */}
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-black uppercase tracking-tighter">
          OBSIDIAN LEDGER
        </h1>

        {/* System status (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
          <span>LATENCY: 14MS</span>
          <span className="text-green-500">ENCRYPTED: AES-256</span>
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-surface-container transition-colors">
          <Icon name="notifications" size="md" className="text-on-surface-variant" />
        </button>
        <button className="p-2 hover:bg-surface-container transition-colors">
          <Icon name="terminal" size="md" className="text-on-surface-variant" />
        </button>
        <button className="p-2 hover:bg-surface-container transition-colors">
          <Icon name="account_circle" size="md" className="text-on-surface-variant" />
        </button>
      </div>
    </header>
  );
}

export default TopNavBar;
