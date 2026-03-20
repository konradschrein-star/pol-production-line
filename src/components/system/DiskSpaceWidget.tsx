'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';

interface DiskSpaceData {
  freeGB: number;
  totalGB: number;
  usedGB: number;
  usedPercent: number;
  warning: boolean;
  critical: boolean;
}

export function DiskSpaceWidget() {
  const [diskSpace, setDiskSpace] = useState<DiskSpaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiskSpace = async () => {
      try {
        const response = await fetch('/api/system/disk-space');
        const data = await response.json();

        if (response.ok) {
          setDiskSpace(data);
          setError(null);
        } else {
          setError(data.error || 'Failed to check disk space');
        }
      } catch (err) {
        setError('Failed to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchDiskSpace();

    // Refresh every 5 minutes
    const interval = setInterval(fetchDiskSpace, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return null; // Don't show loading state
  }

  if (error || !diskSpace) {
    return null; // Silently fail - disk space is not critical to display
  }

  // Only show if there's a warning or critical situation
  if (!diskSpace.warning && !diskSpace.critical) {
    return null;
  }

  const borderColor = diskSpace.critical
    ? 'border-red-500'
    : 'border-yellow-500';
  const bgColor = diskSpace.critical ? 'bg-red-900/20' : 'bg-yellow-900/20';
  const textColor = diskSpace.critical ? 'text-red-500' : 'text-yellow-500';
  const iconName = diskSpace.critical ? 'error' : 'warning';

  return (
    <div className={`p-4 ${bgColor} border-2 ${borderColor}`}>
      <div className="flex items-start gap-4">
        <Icon name={iconName} size="lg" className={`${textColor} flex-shrink-0`} />
        <div className="flex-1">
          <div className={`font-bold ${textColor} text-lg uppercase tracking-wider mb-2`}>
            {diskSpace.critical ? '⚠️ Critical: Low Disk Space' : '⚠️ Warning: Low Disk Space'}
          </div>
          <div className="text-sm text-on-surface mb-3">
            Only <strong className={textColor}>{diskSpace.freeGB} GB</strong> free on C: drive (
            {diskSpace.usedPercent}% used).
          </div>
          <div className="text-sm text-on-surface-variant">
            <strong>Recommendation:</strong> Clean up old videos and temporary files to free up
            space. The system needs at least 5GB free to operate safely.
          </div>
          <div className="mt-3 text-xs font-mono text-on-surface-variant">
            Storage: {diskSpace.usedGB} GB / {diskSpace.totalGB} GB
          </div>
        </div>
      </div>
    </div>
  );
}
