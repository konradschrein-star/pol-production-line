'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import type { HotkeyHandler } from '@/lib/hooks/useHotkeys';

interface HotkeyHelpProps {
  hotkeys: HotkeyHandler[];
}

export function HotkeyHelp({ hotkeys }: HotkeyHelpProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        const isInputFocused =
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable;

        if (!isInputFocused) {
          e.preventDefault();
          setIsOpen((prev) => !prev);
        }
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatKey = (hotkey: HotkeyHandler) => {
    const parts: string[] = [];
    if (hotkey.ctrl) parts.push('Ctrl');
    if (hotkey.shift) parts.push('Shift');
    if (hotkey.alt) parts.push('Alt');
    parts.push(hotkey.key.toUpperCase());
    return parts.join(' + ');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={() => setIsOpen(false)}
    >
      <Card
        variant="high"
        className="max-w-2xl w-full max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-outline-variant px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="keyboard" size="lg" />
            <h2 className="text-lg font-bold text-white uppercase tracking-wider">
              KEYBOARD SHORTCUTS
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <Icon name="close" />
          </Button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {hotkeys.map((hotkey, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-outline-variant last:border-0"
              >
                <div className="text-sm text-on-surface">
                  {hotkey.description}
                </div>
                <div className="flex items-center gap-2">
                  {formatKey(hotkey)
                    .split(' + ')
                    .map((key, i, arr) => (
                      <span key={i} className="flex items-center">
                        <kbd className="px-2 py-1 bg-surface-bright text-white text-xs font-mono border border-outline">
                          {key}
                        </kbd>
                        {i < arr.length - 1 && (
                          <span className="mx-1 text-on-surface-variant">
                            +
                          </span>
                        )}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant text-xs text-on-surface-variant">
            Press <kbd className="px-1 py-0.5 bg-surface-bright text-white font-mono">?</kbd> to toggle this help
          </div>
        </div>
      </Card>
    </div>
  );
}
