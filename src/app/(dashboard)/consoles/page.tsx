'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';

interface ConsoleLog {
  id: string;
  name: string;
  outputFile: string;
  color: string;
  icon: string;
}

const CONSOLES: ConsoleLog[] = [
  {
    id: 'docker',
    name: 'Docker (Postgres + Redis)',
    outputFile: '/api/consoles/docker',
    color: 'text-blue-400',
    icon: 'cloud',
  },
  {
    id: 'workers',
    name: 'BullMQ Workers',
    outputFile: '/api/consoles/workers',
    color: 'text-green-400',
    icon: 'settings',
  },
  {
    id: 'nextjs',
    name: 'Next.js Dev Server',
    outputFile: '/api/consoles/nextjs',
    color: 'text-purple-400',
    icon: 'code',
  },
  {
    id: 'render',
    name: 'Active Render Jobs',
    outputFile: '/api/consoles/render',
    color: 'text-orange-400',
    icon: 'movie',
  },
];

export default function ConsolesPage() {
  const [activeConsole, setActiveConsole] = useState('workers');
  const [consoleLogs, setConsoleLogs] = useState<Record<string, string>>({});
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRefs = useRef<Record<string, HTMLPreElement | null>>({});

  // Fetch console output every 2 seconds
  useEffect(() => {
    const fetchConsoleOutput = async (consoleId: string) => {
      try {
        const console = CONSOLES.find(c => c.id === consoleId);
        if (!console) return;

        const res = await fetch(console.outputFile);
        if (!res.ok) return;

        const text = await res.text();
        setConsoleLogs(prev => ({ ...prev, [consoleId]: text }));
      } catch (error) {
        console.error(`Failed to fetch ${consoleId} logs:`, error);
      }
    };

    // Initial fetch for active console
    fetchConsoleOutput(activeConsole);

    // Poll active console
    const interval = setInterval(() => {
      fetchConsoleOutput(activeConsole);
    }, 2000);

    return () => clearInterval(interval);
  }, [activeConsole]);

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (autoScroll && consoleRefs.current[activeConsole]) {
      const element = consoleRefs.current[activeConsole];
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    }
  }, [consoleLogs[activeConsole], autoScroll, activeConsole]);

  const handleClear = () => {
    setConsoleLogs(prev => ({ ...prev, [activeConsole]: '' }));
  };

  const activeConsoleData = CONSOLES.find(c => c.id === activeConsole);

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Consoles"
      />

      {/* Console Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-2">
        {CONSOLES.map((console) => (
          <button
            key={console.id}
            onClick={() => setActiveConsole(console.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all
              ${activeConsole === console.id
                ? 'bg-surface-container-high text-on-surface border-b-2 border-primary'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
              }
            `}
          >
            <Icon name={console.icon} size="sm" className={console.color} />
            <span className="text-sm font-medium">{console.name}</span>
          </button>
        ))}
      </div>

      {/* Console Output Card */}
      <Card variant="default" className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-container-low border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <Icon
              name={activeConsoleData?.icon || 'terminal'}
              size="sm"
              className={activeConsoleData?.color}
            />
            <span className="text-sm font-medium text-on-surface">
              {activeConsoleData?.name}
            </span>
            <span className="text-xs text-on-surface-variant font-mono">
              Live • Updates every 2s
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${autoScroll
                  ? 'bg-primary/20 text-primary'
                  : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                }
              `}
              title={autoScroll ? 'Auto-scroll: ON' : 'Auto-scroll: OFF'}
            >
              <Icon name={autoScroll ? 'check_circle' : 'radio_button_unchecked'} size="sm" />
              Auto-scroll
            </button>

            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface rounded-lg text-xs font-medium transition-colors"
              title="Clear console"
            >
              <Icon name="delete" size="sm" />
              Clear
            </button>
          </div>
        </div>

        {/* Console Output */}
        <pre
          ref={(el) => { consoleRefs.current[activeConsole] = el; }}
          className="
            p-4 font-mono text-xs leading-relaxed
            bg-[#0a0a0a] text-green-400
            overflow-auto
            whitespace-pre-wrap break-words
          "
          style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}
        >
          {consoleLogs[activeConsole] || `Waiting for ${activeConsoleData?.name} output...\n\nLogs will appear here automatically.`}
        </pre>
      </Card>

      {/* Info Banner */}
      <div className="px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-lg">
        <div className="flex items-start gap-3">
          <Icon name="info" size="sm" className="text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-on-surface mb-1">
              Live Terminal Integration
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              These consoles show real-time output from background services. Auto-scroll keeps the latest logs visible.
              Output refreshes every 2 seconds. Use the tabs above to switch between different services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
