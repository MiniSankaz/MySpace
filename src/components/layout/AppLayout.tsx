'use client';

import { useState } from 'react';
import MainNavigation from './MainNavigation';
import Sidebar from './Sidebar';
import Breadcrumbs from './Breadcrumbs';
import { Bars3Icon } from '@heroicons/react/24/outline';

interface AppLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showBreadcrumbs?: boolean;
}

export default function AppLayout({ 
  children, 
  showSidebar = true,
  showBreadcrumbs = true 
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MainNavigation>
      {showSidebar && <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />}
      
      <div className={showSidebar ? 'lg:pl-72' : ''}>
        {/* Mobile sidebar toggle */}
        {showSidebar && (
          <div className="sticky top-0 z-40 lg:hidden">
            <button
              type="button"
              className="m-2.5 p-2.5 text-gray-700 bg-white rounded-md shadow-sm border border-gray-300"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Bars3Icon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        )}

        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {showBreadcrumbs && <Breadcrumbs />}
            {children}
          </div>
        </main>
      </div>
    </MainNavigation>
  );
}