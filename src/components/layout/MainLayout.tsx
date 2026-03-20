import React from 'react';
import TopNavBar from './TopNavBar';
import SideNavBar from './SideNavBar';
import GrainOverlay from '@/components/shared/GrainOverlay';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      <SideNavBar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <TopNavBar />
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-12 py-12">
            {children}
          </div>
        </div>
      </main>
      <GrainOverlay />
    </div>
  );
}

export default MainLayout;
