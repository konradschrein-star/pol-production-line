'use client';

import { useEffect, useState } from 'react';

interface SecurityTimelineProps {
  timeRange?: '24h' | '7d' | '30d';
  refreshInterval?: number; // milliseconds
}

interface SecurityEvent {
  id: string;
  timestamp: string;
  event_type: string;
  actor: string;
  resource_type: string | null;
  resource_id: string | null;
  action: string;
  details: any;
  severity: 'info' | 'warning' | 'critical';
  ip_address: string | null;
  user_agent: string | null;
}

interface SecurityEventsResponse {
  events: SecurityEvent[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  filters: {
    eventTypes: Array<{ event_type: string; count: number }>;
    severities: Array<{ severity: string; count: number }>;
  };
  alerts: {
    criticalEventsLastHour: Array<{ event_type: string; count: number }>;
    totalCriticalLastHour: number;
  };
  timestamp: string;
}

export function SecurityTimeline({
  timeRange = '24h',
  refreshInterval = 30000, // 30 seconds
}: SecurityTimelineProps) {
  const [data, setData] = useState<SecurityEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const fetchEvents = async () => {
    try {
      const params = new URLSearchParams({
        range: timeRange,
        limit: '50',
      });

      if (selectedSeverity) params.append('severity', selectedSeverity);
      if (selectedEventType) params.append('event_type', selectedEventType);

      const res = await fetch(`/api/security/events?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const events = await res.json();
      setData(events);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, refreshInterval);
    return () => clearInterval(interval);
  }, [timeRange, refreshInterval, selectedSeverity, selectedEventType]);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading security events...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">No data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters and Last Update */}
      <div className="bg-surface_container rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Security Events</h2>
          {lastUpdate && (
            <div className="text-xs text-gray-400 font-mono">
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Critical Alerts (if any) */}
        {data.alerts.totalCriticalLastHour > 0 && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-red-400 text-xl">🚨</span>
              <span className="text-red-400 font-semibold">
                {data.alerts.totalCriticalLastHour} Critical Event
                {data.alerts.totalCriticalLastHour !== 1 ? 's' : ''} in Last Hour
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.alerts.criticalEventsLastHour.map((event) => (
                <span
                  key={event.event_type}
                  className="px-2 py-1 rounded text-xs font-mono bg-red-500/20 text-red-400"
                >
                  {event.event_type}: {event.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {/* Severity Filter */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
              Severity
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSeverity(null)}
                className={`
                  px-3 py-1 rounded text-xs font-semibold transition-colors
                  ${
                    selectedSeverity === null
                      ? 'bg-blue-500 text-white'
                      : 'bg-surface_container_high text-gray-400 hover:text-white'
                  }
                `}
              >
                All
              </button>
              {data.filters.severities.map((s) => (
                <button
                  key={s.severity}
                  onClick={() => setSelectedSeverity(s.severity)}
                  className={`
                    px-3 py-1 rounded text-xs font-semibold transition-colors
                    ${
                      selectedSeverity === s.severity
                        ? s.severity === 'critical'
                          ? 'bg-red-500 text-white'
                          : s.severity === 'warning'
                          ? 'bg-yellow-500 text-black'
                          : 'bg-blue-500 text-white'
                        : 'bg-surface_container_high text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {s.severity} ({s.count})
                </button>
              ))}
            </div>
          </div>

          {/* Event Type Filter */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide mb-2 block">
              Event Type
            </label>
            <select
              value={selectedEventType || ''}
              onChange={(e) => setSelectedEventType(e.target.value || null)}
              className="px-3 py-1 bg-surface_container_high text-white text-xs rounded border border-surface_bright focus:outline-none focus:border-primary"
            >
              <option value="">All Types</option>
              {data.filters.eventTypes.map((et) => (
                <option key={et.event_type} value={et.event_type}>
                  {et.event_type} ({et.count})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-surface_container rounded-xl shadow-md">
        <div className="divide-y divide-surface_container_lowest">
          {data.events.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <div className="text-lg font-medium mb-2">No events found</div>
              <div className="text-sm">Try adjusting the filters or time range</div>
            </div>
          ) : (
            data.events.map((event) => (
              <div
                key={event.id}
                className={`
                  p-4 hover:bg-surface_container_high transition-colors
                  ${
                    event.severity === 'critical'
                      ? 'bg-red-900/10'
                      : event.severity === 'warning'
                      ? 'bg-yellow-900/10'
                      : ''
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Event Header */}
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`
                          px-2 py-1 rounded text-xs font-semibold
                          ${
                            event.severity === 'critical'
                              ? 'bg-red-500 text-white'
                              : event.severity === 'warning'
                              ? 'bg-yellow-500 text-black'
                              : 'bg-blue-500 text-white'
                          }
                        `}
                      >
                        {event.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-mono bg-surface_container_lowest text-gray-300">
                        {event.event_type}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>

                    {/* Event Details */}
                    <div className="text-sm text-gray-200 mb-2">
                      <span className="font-semibold">{event.action}</span>
                      {event.resource_type && (
                        <>
                          {' '}
                          on{' '}
                          <span className="font-mono text-gray-400">
                            {event.resource_type}
                            {event.resource_id && `:${event.resource_id.substring(0, 8)}`}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actor & IP */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Actor: <span className="font-mono text-gray-400">{event.actor}</span>
                      </span>
                      {event.ip_address && (
                        <span>
                          IP: <span className="font-mono text-gray-400">{event.ip_address}</span>
                        </span>
                      )}
                    </div>

                    {/* Expanded Details */}
                    {expandedEvents.has(event.id) && event.details && (
                      <div className="mt-3 p-3 bg-surface_container_lowest rounded-lg">
                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">
                          Details
                        </div>
                        <pre className="text-xs text-gray-300 overflow-x-auto">
                          {JSON.stringify(event.details, null, 2)}
                        </pre>
                        {event.user_agent && (
                          <div className="mt-2 text-xs text-gray-500">
                            <span className="text-gray-400">User Agent:</span> {event.user_agent}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expand Button */}
                  {event.details && (
                    <button
                      onClick={() => toggleEventExpansion(event.id)}
                      className="flex-shrink-0 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-surface_container_lowest transition-colors"
                    >
                      {expandedEvents.has(event.id) ? 'Hide' : 'Details'}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {data.pagination.hasMore && (
          <div className="p-4 border-t border-surface_container_lowest text-center">
            <button className="px-4 py-2 rounded text-sm font-medium bg-surface_container_high text-white hover:bg-surface_bright transition-colors">
              Load More Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
