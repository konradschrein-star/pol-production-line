'use client';

import { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/utils/format';

interface RelativeTimeProps {
  timestamp: string;
  updateInterval?: number; // milliseconds
  className?: string;
}

export function RelativeTime({ timestamp, updateInterval = 1000, className = '' }: RelativeTimeProps) {
  const [relativeTime, setRelativeTime] = useState(formatRelativeTime(timestamp));

  useEffect(() => {
    // Update immediately
    setRelativeTime(formatRelativeTime(timestamp));

    // Then update on interval
    const interval = setInterval(() => {
      setRelativeTime(formatRelativeTime(timestamp));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [timestamp, updateInterval]);

  return <span className={className}>{relativeTime}</span>;
}
