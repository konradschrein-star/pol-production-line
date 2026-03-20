import React from 'react';
import { Button } from '@/components/ui/Button';

interface BulkActionToolbarProps {
  selectedCount: number;
  onDelete: () => void;
  onCancel: () => void;
  onClearSelection: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onDelete,
  onCancel,
  onClearSelection,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg">
      <span className="text-sm font-medium text-on-surface">
        {selectedCount} selected
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          className="text-xs"
        >
          Cancel Jobs
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onDelete}
          className="text-xs text-red-400 border-red-500/30 hover:bg-red-500/10"
        >
          Delete
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onClearSelection}
          className="text-xs"
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
