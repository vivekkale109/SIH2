import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';

import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'SDMS — Secure Digital Document Management System',
  description:
    'Case-centric secure document management system for legal and investigation documents with hash-chained ledger and verifiable exports.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text antialiased">
        <AuthProvider>
          <Navbar />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
