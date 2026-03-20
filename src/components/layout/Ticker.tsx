'use client';

interface TickerProps {
  messages?: string[];
}

export function Ticker({ messages = ['SYSTEM OPERATIONAL', 'QUEUE STATUS: ACTIVE', 'RENDER ENGINE: READY'] }: TickerProps) {
  const tickerText = messages.join(' • ');

  return (
    <div className="fixed bottom-0 left-0 w-full h-8 z-50 bg-surface-container-highest border-t border-outline-variant overflow-hidden">
      <div className="flex items-center h-full">
        <div className="animate-[scroll_30s_linear_infinite] whitespace-nowrap">
          <span className="font-mono text-[10px] font-bold text-white tracking-widest uppercase">
            {tickerText} • {tickerText} • {tickerText}
          </span>
        </div>
      </div>
    </div>
  );
}

export default Ticker;
