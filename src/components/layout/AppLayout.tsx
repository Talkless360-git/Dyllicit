'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AudioPlayer from '@/components/player/AudioPlayer';

/**
 * AppLayout Component
 * 
 * This component acts as a switcher between the standard "Listener" layout
 * and the specialized "Studio/Admin" layouts.
 * 
 * It prevents the default listener sidebar and audio player from appearing 
 * on routes that manage their own navigation and layout structure.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define routes that should NOT have the listener shell (Sidebar and Audio Player)
  // These routes usually have their own specialized layout or are full-page experiences.
  const isSpecialistRoute = 
    pathname.startsWith('/artist') || 
    pathname.startsWith('/admin') ||
    pathname === '/signup' ||
    pathname === '/login' ||
    pathname.startsWith('/onboarding');

  // If we are on a specialist route, just render the children.
  // This allows the route's own layout to take full control of the viewport.
  if (isSpecialistRoute) {
    return <>{children}</>;
  }

  // Standard Listener Layout
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
      <AudioPlayer />
    </div>
  );
}
