import type { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { FloatingChat } from '@/shared/ui/FloatingChat';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[--color-bg] relative">
      <Navbar />
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 pt-0.5 pb-8 sm:px-6 md:px-14 md:pb-10 flex flex-col">{children}</main>
      <Footer />
      <FloatingChat />
    </div>
  );
}
