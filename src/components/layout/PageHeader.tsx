import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-end border-b border-outline-variant pb-6">
      <div>
        <h1 className="text-4xl font-black uppercase tracking-tighter text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="font-mono text-sm text-on-surface-variant mt-2">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export default PageHeader;
