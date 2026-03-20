import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-end border-b border-outline-variant/30 pb-8 mb-12">
      <div>
        <h1 className="text-3xl font-semibold text-white mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-on-surface-variant">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export default PageHeader;
