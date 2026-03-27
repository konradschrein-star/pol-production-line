/**
 * Persona Card Component
 *
 * Displays a single persona with all its details and actions.
 * Part of modular personas system for mass content production.
 */

'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import type { Persona } from '@/lib/personas/manager';

interface PersonaCardProps {
  persona: Persona;
  onEdit: (persona: Persona) => void;
  onDelete: (id: string) => void;
  onUse: (persona: Persona) => void;
}

export function PersonaCard({ persona, onEdit, onDelete, onUse }: PersonaCardProps) {
  return (
    <Card variant="default" className="hover:shadow-lg transition-all">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                {persona.name}
              </h3>
              {persona.isSystemPreset && (
                <Badge variant="default">System</Badge>
              )}
              {persona.category && (
                <Badge variant="secondary" className="capitalize">
                  {persona.category}
                </Badge>
              )}
            </div>
            {persona.description && (
              <p className="text-sm text-on-surface-variant">
                {persona.description}
              </p>
            )}
          </div>

          {/* Usage Count */}
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              {persona.jobsCreatedCount || 0}
            </div>
            <div className="text-xs text-on-surface-variant uppercase tracking-wider">
              Videos
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/20">
          {/* Target Audience */}
          {persona.targetAudience && (
            <div>
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                Target Audience
              </div>
              <div className="text-sm text-on-surface">
                {persona.targetAudience}
              </div>
            </div>
          )}

          {/* Video Length */}
          <div>
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Default Length
            </div>
            <div className="text-sm text-on-surface">
              {persona.defaultVideoLengthSeconds || 60}s / {persona.scenesPerVideo || 8} scenes
            </div>
          </div>

          {/* Pacing Style */}
          <div>
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
              Pacing
            </div>
            <div className="text-sm text-on-surface capitalize">
              {persona.pacingStyle || 'balanced'}
            </div>
          </div>

          {/* AI Provider */}
          {persona.aiProvider && (
            <div>
              <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">
                AI Provider
              </div>
              <div className="text-sm text-on-surface capitalize">
                {persona.aiProvider}
              </div>
            </div>
          )}
        </div>

        {/* Tone Guidelines */}
        {persona.toneGuidelines && (
          <div className="pt-4 border-t border-outline-variant/20">
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">
              Tone Guidelines
            </div>
            <p className="text-sm text-on-surface leading-relaxed">
              {persona.toneGuidelines}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-outline-variant/20 flex gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onUse(persona)}
            className="flex-1"
          >
            <Icon name="add_circle" size="sm" className="mr-2" />
            Create Video
          </Button>

          {!persona.isSystemPreset && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onEdit(persona)}
              >
                <Icon name="edit" size="sm" className="mr-2" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(persona.id)}
              >
                <Icon name="delete" size="sm" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
