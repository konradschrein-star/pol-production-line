'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface SystemHealth {
  whisk_token: {
    age_minutes: number;
    expires_in_minutes: number;
    status: 'ok' | 'warning' | 'critical';
  };
  rate_limits: {
    requests_last_hour: number;
    quota: number;
    percentage_used: number;
    status: 'ok' | 'warning' | 'critical';
  };
  error_rate: {
    failed_scenes_24h: number;
    total_scenes_24h: number;
    percentage: number;
    status: 'ok' | 'warning' | 'critical';
  };
  disk_space: {
    available_gb: number;
    used_gb: number;
    total_gb: number;
    status: 'ok' | 'warning' | 'critical';
  };
  services: {
    postgres: 'connected' | 'disconnected';
    redis: 'connected' | 'disconnected';
    workers: 'running' | 'stopped';
  };
}

interface SystemHealthWidgetProps {
  onRefreshToken?: () => void;
}

export function SystemHealthWidget({ onRefreshToken }: SystemHealthWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    // Initial load
    fetchHealth();

    // Poll every 30 seconds
    const interval = setInterval(fetchHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Show desktop notification for critical issues
  useEffect(() => {
    if (!health) return;

    const hasCriticalIssue =
      health.whisk_token.status === 'critical' ||
      health.rate_limits.status === 'critical' ||
      health.services.postgres === 'disconnected' ||
      health.services.redis === 'disconnected';

    if (hasCriticalIssue && 'Notification' in window && Notification.permission === 'granted') {
      const criticalIssues = [];
      if (health.whisk_token.status === 'critical') {
        criticalIssues.push('Whisk token expired');
      }
      if (health.services.postgres === 'disconnected') {
        criticalIssues.push('Database disconnected');
      }
      if (health.services.redis === 'disconnected') {
        criticalIssues.push('Redis disconnected');
      }

      if (criticalIssues.length > 0) {
        new Notification('System Health Alert', {
          body: criticalIssues.join(', '),
          icon: '/icon.png',
        });
      }
    }
  }, [health]);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/system/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOverallStatus = (): 'ok' | 'warning' | 'critical' => {
    if (!health) return 'ok';

    const statuses = [
      health.whisk_token.status,
      health.rate_limits.status,
      health.error_rate.status,
      health.disk_space.status,
    ];

    if (statuses.includes('critical')) return 'critical';
    if (statuses.includes('warning')) return 'warning';
    return 'ok';
  };

  const getStatusIcon = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
        return '🔴';
    }
  };

  const getStatusColor = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'ok':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
    }
  };

  const overallStatus = getOverallStatus();

  if (!isExpanded) {
    // Collapsed state - small indicator
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed top-4 right-4 bg-surface_container border border-outline-variant rounded-lg px-4 py-2 shadow-lg hover:shadow-xl transition-all z-40"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{getStatusIcon(overallStatus)}</span>
          <span className={`text-sm font-medium ${getStatusColor(overallStatus)}`}>
            {overallStatus === 'ok'
              ? 'All Systems'
              : overallStatus === 'warning'
              ? 'Warning'
              : 'Critical'}
          </span>
        </div>
      </button>
    );
  }

  // Expanded state - full health panel
  return (
    <div className="fixed top-4 right-4 bg-surface_container border border-outline-variant rounded-xl w-96 shadow-2xl z-40">
      {/* Header */}
      <div className="px-5 py-4 border-b border-outline-variant/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getStatusIcon(overallStatus)}</span>
            <div>
              <h3 className="text-lg font-bold text-gray-200">System Health</h3>
              {lastUpdate && (
                <p className="text-xs text-gray-500">
                  Updated {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <Icon name="close" size="sm" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {health ? (
          <>
            {/* Whisk Token */}
            <div className="bg-surface_container_low rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(health.whisk_token.status)}</span>
                  <span className="text-sm font-semibold text-gray-300">Whisk Token</span>
                </div>
                <Badge
                  color={
                    health.whisk_token.status === 'critical'
                      ? 'red'
                      : health.whisk_token.status === 'warning'
                      ? 'yellow'
                      : 'green'
                  }
                  size="sm"
                >
                  {health.whisk_token.expires_in_minutes}min left
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                Age: {health.whisk_token.age_minutes} minutes
              </p>
              {health.whisk_token.status === 'critical' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={onRefreshToken}
                  className="w-full mt-2"
                >
                  <Icon name="refresh-cw" size="xs" />
                  Refresh Token
                </Button>
              )}
            </div>

            {/* Rate Limits */}
            <div className="bg-surface_container_low rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(health.rate_limits.status)}</span>
                  <span className="text-sm font-semibold text-gray-300">Rate Limit</span>
                </div>
                <Badge
                  color={
                    health.rate_limits.status === 'critical'
                      ? 'red'
                      : health.rate_limits.status === 'warning'
                      ? 'yellow'
                      : 'green'
                  }
                  size="sm"
                >
                  {health.rate_limits.percentage_used.toFixed(0)}% used
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {health.rate_limits.requests_last_hour} / {health.rate_limits.quota} requests/hr
              </p>
              <div className="mt-2 h-1 bg-surface_container rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    health.rate_limits.status === 'critical'
                      ? 'bg-red-500'
                      : health.rate_limits.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${health.rate_limits.percentage_used}%` }}
                />
              </div>
            </div>

            {/* Error Rate */}
            <div className="bg-surface_container_low rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(health.error_rate.status)}</span>
                  <span className="text-sm font-semibold text-gray-300">Error Rate</span>
                </div>
                <Badge
                  color={
                    health.error_rate.status === 'critical'
                      ? 'red'
                      : health.error_rate.status === 'warning'
                      ? 'yellow'
                      : 'green'
                  }
                  size="sm"
                >
                  {health.error_rate.percentage.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {health.error_rate.failed_scenes_24h} / {health.error_rate.total_scenes_24h} scenes
                failed (24h)
              </p>
            </div>

            {/* Disk Space */}
            <div className="bg-surface_container_low rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getStatusIcon(health.disk_space.status)}</span>
                  <span className="text-sm font-semibold text-gray-300">Disk Space</span>
                </div>
                <Badge
                  color={
                    health.disk_space.status === 'critical'
                      ? 'red'
                      : health.disk_space.status === 'warning'
                      ? 'yellow'
                      : 'green'
                  }
                  size="sm"
                >
                  {health.disk_space.available_gb.toFixed(1)} GB free
                </Badge>
              </div>
              <p className="text-xs text-gray-500">
                {health.disk_space.used_gb.toFixed(1)} GB used of{' '}
                {health.disk_space.total_gb.toFixed(1)} GB
              </p>
            </div>

            {/* Services */}
            <div className="bg-surface_container_low rounded-lg p-3">
              <div className="flex items-center gap-2 mb-3">
                <Icon name="server" size="sm" className="text-gray-400" />
                <span className="text-sm font-semibold text-gray-300">Services</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">PostgreSQL</span>
                  <Badge
                    color={health.services.postgres === 'connected' ? 'green' : 'red'}
                    size="sm"
                  >
                    {health.services.postgres}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Redis</span>
                  <Badge
                    color={health.services.redis === 'connected' ? 'green' : 'red'}
                    size="sm"
                  >
                    {health.services.redis}
                  </Badge>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Workers</span>
                  <Badge
                    color={health.services.workers === 'running' ? 'green' : 'yellow'}
                    size="sm"
                  >
                    {health.services.workers}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {loading ? 'Loading health status...' : 'Failed to load health status'}
          </div>
        )}

        {/* Refresh Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={fetchHealth}
          disabled={loading}
          className="w-full"
        >
          <Icon name={loading ? 'refresh-cw' : 'refresh-cw'} size="xs" className={loading ? 'animate-spin' : ''} />
          {loading ? 'Refreshing...' : 'Refresh Status'}
        </Button>
      </div>
    </div>
  );
}
