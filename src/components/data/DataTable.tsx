'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  width?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T, index: number) => void;
  selectedIndex?: number;
  emptyMessage?: string;
  // NEW PROPS
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  getItemId?: (item: T) => string;
  sortable?: boolean;
  currentSort?: { column: string; order: 'asc' | 'desc' };
  onSort?: (column: string, order: 'asc' | 'desc') => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  selectedIndex,
  emptyMessage = 'No data available',
  selectable = false,
  selectedIds = new Set(),
  onSelectionChange,
  getItemId = (item: any) => item.id,
  sortable = false,
  currentSort,
  onSort,
}: DataTableProps<T>) {
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;

    if (checked) {
      const allIds = new Set(data.map(getItemId));
      onSelectionChange(allIds);
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleSelectRow = (itemId: string, checked: boolean) => {
    if (!onSelectionChange) return;

    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    onSelectionChange(newSelection);
  };

  const handleHeaderClick = (columnKey: string) => {
    if (!sortable || !onSort) return;

    const newOrder =
      currentSort?.column === columnKey && currentSort.order === 'desc'
        ? 'asc'
        : 'desc';
    onSort(columnKey, newOrder);
  };

  const allSelected = data.length > 0 && data.every(item => selectedIds.has(getItemId(item)));
  const someSelected = data.some(item => selectedIds.has(getItemId(item))) && !allSelected;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-surface-container border-b-2 border-outline">
          <tr>
            {selectable && (
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) input.indeterminate = someSelected;
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-outline-variant"
                />
              </th>
            )}
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className={`px-6 py-3 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider ${
                  sortable && column.sortable !== false ? 'cursor-pointer hover:text-primary' : ''
                }`}
                onClick={() => sortable && column.sortable !== false && handleHeaderClick(column.key)}
              >
                <div className="flex items-center gap-2">
                  {column.label}
                  {sortable && column.sortable !== false && currentSort?.column === column.key && (
                    <span className="text-primary">
                      {currentSort.order === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/20">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-6 py-12 text-center text-on-surface-variant"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => {
              const itemId = getItemId(item);
              const isSelected = selectedIds.has(itemId);
              const isHighlighted = selectedIndex === index;

              return (
                <tr
                  key={itemId}
                  className={`
                    transition-colors cursor-pointer
                    ${isSelected ? 'bg-surface-bright' :
                      isHighlighted ? 'bg-surface-container-high' :
                      'hover:bg-surface-container'}
                  `}
                  onClick={() => onRowClick?.(item, index)}
                >
                  {selectable && (
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectRow(itemId, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-outline-variant"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.key} className="px-6 py-4 text-sm text-on-surface">
                      {column.render ? column.render(item) : item[column.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
