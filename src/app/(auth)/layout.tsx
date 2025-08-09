'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  
  // Assistant page has its own layout
  if (pathname === '/assistant') {
    return <>{children}</>;
  }
  
  // Other pages use AppLayout
  return (
    <AppLayout showSidebar={true} showBreadcrumbs={true}>
      {children}
    </AppLayout>
  );
}