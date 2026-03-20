'use client';

import { useEffect, useCallback } from 'react';

export interface HotkeyHandler {
  key: string;
  description: string;
  handler: () => void;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  global?: boolean; // If true, works even when input is focused
}

export function useHotkeys(
  hotkeys: HotkeyHandler[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger hotkeys when typing in inputs (unless global)
      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const hotkey of hotkeys) {
        // Skip non-global hotkeys when input is focused
        if (isInputFocused && !hotkey.global) continue;

        // Match key combination
        const keyMatch =
          e.key.toLowerCase() === hotkey.key.toLowerCase() ||
          e.code.toLowerCase() === hotkey.key.toLowerCase();

        const ctrlMatch = hotkey.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const shiftMatch = hotkey.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = hotkey.alt ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          hotkey.handler();
          break;
        }
      }
    },
    [hotkeys, enabled]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return hotkeys;
}
