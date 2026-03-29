'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getErrorDetails, ErrorCategory, getErrorBadgeColor } from '@/lib/errors/categorization';

interface GenerationHistoryEntry {
  attempt: number;
  timestamp: string;
  prompt_used: string;
  error: string;
  generation_time_ms?: number;
}

interface ErrorDetails {
  current_error: {
    message: string;
    code: string;
    category: ErrorCategory;
    solution: string;
  };
  sanitization_attempts: number;
  generation_history: GenerationHistoryEntry[];
  can_retry: boolean;
}

interface SceneErrorPanelProps {
  sceneId: string;
  jobId: string;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  sanitizationAttempts?: number;
  onEditAndRetry?: () => void;
  onUploadImage?: () => void;
}

export function SceneErrorPanel({
  sceneId,
  jobId,
  errorCategory = 'unknown',
  errorMessage,
  sanitizationAttempts = 0,
  onEditAndRetry,
  onUploadImage,
}: SceneErrorPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ErrorDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const errorInfo = getErrorDetails(errorCategory, sanitizationAttempts);
  const badgeColor = getErrorBadgeColor(errorCategory);

  // Fetch detailed error information when expanded
  useEffect(() => {
    if (isExpanded && !errorDetails) {
      loadErrorDetails();
    }
  }, [isExpanded]);

  const loadErrorDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/scenes/${sceneId}/errors`);
      if (response.ok) {
        const data = await response.json();
        setErrorDetails(data);
      }
    } catch (error) {
      console.error('Failed to load error details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: ErrorCategory): string => {
    switch (category) {
      case 'policy_violation':
        return 'Policy Violation';
      case 'timeout':
        return 'Timeout';
      case 'rate_limit':
        return 'Rate Limited';
      case 'auth_error':
        return 'Token Expired';
      case 'api_error':
        return 'API Error';
      default:
        return 'Error';
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/5">
      {/* Collapsed State - Error Summary */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-red-500/10 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Icon name="alert-triangle" size="md" className="text-red-400" />
          <span className="font-medium text-red-200">Generation Failed</span>
          <Badge color={badgeColor as any} size="sm">
            {getCategoryLabel(errorCategory)}
          </Badge>
        </div>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size="sm"
          className="text-gray-400"
        />
      </button>

      {/* Expanded State - Detailed Error Information */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-red-500/20 pt-4 mt-2">
          {/* Error Message */}
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-1">Error Details</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              {errorInfo.userMessage}
            </p>
            {errorMessage && (
              <p className="text-xs text-gray-500 mt-2 font-mono bg-surface_container_low p-2 rounded">
                {errorMessage.length > 200 ? `${errorMessage.substring(0, 200)}...` : errorMessage}
              </p>
            )}
          </div>

          {/* Sanitization Attempts (for policy violations) */}
          {errorCategory === 'policy_violation' && sanitizationAttempts > 0 && (
            <div className="bg-surface_container_low rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="refresh-cw" size="sm" className="text-yellow-400" />
                <h4 className="text-sm font-semibold text-gray-300">Sanitization Attempts</h4>
              </div>
              <p className="text-sm text-gray-400">
                {sanitizationAttempts} of 3 attempts used
                {sanitizationAttempts >= 3 && (
                  <span className="text-red-400 ml-2 font-medium">(Max reached)</span>
                )}
              </p>
            </div>
          )}

          {/* Solution Suggestions */}
          <div className="bg-surface_container_low rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="lightbulb" size="sm" className="text-blue-400" />
              <h4 className="text-sm font-semibold text-gray-300">What can I do?</h4>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-3">{errorInfo.solution}</p>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap">
              {errorInfo.canRetry && onEditAndRetry && (
                <Button size="sm" variant="secondary" onClick={onEditAndRetry}>
                  <Icon name="edit" size="sm" />
                  Edit & Retry
                </Button>
              )}
              {onUploadImage && (
                <Button size="sm" variant="secondary" onClick={onUploadImage}>
                  <Icon name="upload" size="sm" />
                  Upload Image
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(!showHistory)}
              >
                <Icon name="history" size="sm" />
                {showHistory ? 'Hide' : 'View'} History
              </Button>
            </div>
          </div>

          {/* Generation History */}
          {showHistory && errorDetails && (
            <div className="bg-surface_container_low rounded-lg p-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Generation History</h4>
              {loading ? (
                <div className="text-sm text-gray-500 text-center py-4">Loading history...</div>
              ) : errorDetails.generation_history.length > 0 ? (
                <div className="space-y-2">
                  {errorDetails.generation_history.map((entry, index) => (
                    <div
                      key={index}
                      className="border border-surface_bright rounded p-2 text-xs space-y-1"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-300">
                          Attempt {entry.attempt}
                        </span>
                        <span className="text-gray-500">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-gray-400 line-clamp-2">{entry.prompt_used}</div>
                      <div className="text-red-400">{entry.error}</div>
                      {entry.generation_time_ms && (
                        <div className="text-gray-500">
                          Duration: {(entry.generation_time_ms / 1000).toFixed(1)}s
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-2">
                  No generation history available
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
