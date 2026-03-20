'use client';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';

export default function PersonasPage() {
  return (
    <div>
      <PageHeader
        title="PERSONAS"
        subtitle="Avatar & Presenter Management"
      />

      <div className="max-w-4xl mx-auto space-y-6">
        <Card variant="default">
          <div className="px-6 py-12 text-center space-y-4">
            <div className="text-6xl text-outline-variant">👤</div>

            <h2 className="text-xl font-bold text-white uppercase tracking-wider">
              Personas Management
            </h2>

            <p className="text-on-surface-variant max-w-lg mx-auto">
              This feature is coming soon. Eventually, you'll be able to manage saved presenter personas and avatars here.
            </p>

            <p className="text-sm text-outline-variant mt-6">
              For now, avatars are created manually via HeyGen during the job review process.
            </p>

            <div className="mt-8">
              <a
                href="https://heygen.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-primary text-on-primary px-6 py-3 font-bold uppercase text-sm tracking-widest hover:bg-on-primary hover:text-primary border border-primary transition-colors duration-75"
              >
                Open HeyGen →
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
