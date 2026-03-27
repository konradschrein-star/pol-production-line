'use client';

import { useEffect, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';

interface LogEntry {
  timestamp: string;
  type: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

interface ConsoleLogProps {
  logs: LogEntry[];
  title?: string;
  maxHeight?: string;
  autoScroll?: boolean;
}

export function ConsoleLog({
  logs,
  title = 'Console Output',
  maxHeight = '300px',
  autoScroll = true,
}: ConsoleLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-400';
      case 'warn':
        return 'text-yellow-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-on-surface-variant';
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error':
        return 'error';
      case 'warn':
        return 'warning';
      case 'success':
        return 'check_circle';
      default:
        return 'info';
    }
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-surface-container-high border-b border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="terminal" size="sm" className="text-primary" />
          <span className="text-sm font-semibold text-white">{title}</span>
        </div>
        <div className="text-xs text-on-surface-variant font-mono">
          {logs.length} log{logs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Console Output */}
      <div
        ref={containerRef}
        className="overflow-y-auto font-mono text-xs p-4 space-y-1 bg-black/20"
        style={{ maxHeight }}
      >
        {logs.length === 0 ? (
          <div className="text-on-surface-variant italic">No logs yet...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="flex items-start gap-3">
              <span className="text-on-surface-variant/50 flex-shrink-0 w-20">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <Icon
                name={getLogIcon(log.type)}
                size="sm"
                className={`${getLogColor(log.type)} flex-shrink-0 mt-0.5`}
              />
              <span className={`${getLogColor(log.type)} flex-1 break-all`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
