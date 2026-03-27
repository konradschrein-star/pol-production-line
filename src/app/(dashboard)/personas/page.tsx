/**
 * Personas Management Page
 *
 * Manage reusable content personas/templates for mass production.
 * Allows users to create, edit, and use personas for consistent video creation.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { PersonaCard } from '@/components/personas/PersonaCard';
import type { Persona } from '@/lib/personas/manager';

export default function PersonasPage() {
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'system' | 'custom'>('all');

  useEffect(() => {
    loadPersonas();
  }, [filter]);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        activeOnly: 'true',
      });

      if (filter === 'system') {
        params.set('systemPresetsOnly', 'true');
      } else if (filter === 'custom') {
        params.set('systemPresetsOnly', 'false');
      }

      const response = await fetch(`/api/personas?${params}`);
      const data = await response.json();

      if (data.success) {
        setPersonas(data.personas);
      }
    } catch (error) {
      console.error('Failed to load personas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (persona: Persona) => {
    // TODO: Open edit modal
    alert(`Edit persona: ${persona.name}\n\nEdit modal coming soon!`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this persona? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/personas?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadPersonas();
      } else {
        const data = await response.json();
        alert(`Failed to delete: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete persona:', error);
      alert('Failed to delete persona');
    }
  };

  const handleUse = (persona: Persona) => {
    // Navigate to new broadcast page with persona pre-selected
    router.push(`/broadcasts/new?persona=${persona.id}`);
  };

  const handleCreateNew = () => {
    // TODO: Open create modal
    alert('Create new persona modal coming soon!');
  };

  if (loading) {
    return (
      <div>
        <PageHeader
          title="PERSONAS"
          subtitle="Content Templates & Style Presets"
        />
        <div className="text-center py-12 text-on-surface-variant">
          Loading personas...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="PERSONAS"
        subtitle="Reusable templates for consistent mass production"
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All Personas ({personas.length})
            </Button>
            <Button
              variant={filter === 'system' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('system')}
            >
              <Icon name="star" size="sm" className="mr-2" />
              System Presets
            </Button>
            <Button
              variant={filter === 'custom' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('custom')}
            >
              <Icon name="person" size="sm" className="mr-2" />
              Custom
            </Button>
          </div>

          {/* Create Button */}
          <Button variant="primary" onClick={handleCreateNew}>
            <Icon name="add" size="sm" className="mr-2" />
            Create Persona
          </Button>
        </div>

        {/* Personas Grid */}
        {personas.length === 0 ? (
          <Card variant="default">
            <div className="p-12 text-center">
              <Icon name="person" size="lg" className="mx-auto mb-4 text-on-surface-variant" />
              <p className="text-lg text-on-surface-variant mb-4">
                No personas found
              </p>
              <p className="text-sm text-on-surface-variant mb-6">
                {filter === 'custom'
                  ? 'Create your first custom persona to get started'
                  : 'Create a persona to define reusable content styles'}
              </p>
              <Button variant="primary" onClick={handleCreateNew}>
                <Icon name="add" size="sm" className="mr-2" />
                Create Your First Persona
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {personas.map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUse={handleUse}
              />
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <Card variant="default">
          <div className="px-6 py-4 border-b border-outline-variant/20">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              📊 Quick Stats
            </h2>
          </div>
          <div className="grid grid-cols-4 divide-x divide-outline-variant/20">
            <div className="px-6 py-6 text-center">
              <div className="text-3xl font-bold text-white mb-1">
                {personas.length}
              </div>
              <div className="text-xs text-on-surface-variant uppercase tracking-wider">
                Total Personas
              </div>
            </div>
            <div className="px-6 py-6 text-center">
              <div className="text-3xl font-bold text-primary mb-1">
                {personas.filter(p => p.isSystemPreset).length}
              </div>
              <div className="text-xs text-on-surface-variant uppercase tracking-wider">
                System Presets
              </div>
            </div>
            <div className="px-6 py-6 text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">
                {personas.filter(p => !p.isSystemPreset).length}
              </div>
              <div className="text-xs text-on-surface-variant uppercase tracking-wider">
                Custom
              </div>
            </div>
            <div className="px-6 py-6 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-1">
                {personas.reduce((sum, p) => sum + (p.jobsCreatedCount || 0), 0)}
              </div>
              <div className="text-xs text-on-surface-variant uppercase tracking-wider">
                Videos Created
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
