'use client';

import React from 'react';
import { ShieldCheck, Search, Bell, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3">
        <div className="bg-primary/10 text-primary p-2 rounded-lg">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <span className="font-bold text-lg text-text tracking-tight">SDMS</span>
          <span className="hidden sm:inline-block ml-2 text-xs font-medium text-muted bg-surface-alt px-2 py-0.5 rounded border border-border">
            CID Unit / Special Crime Branch
          </span>
        </div>
      </div>

      <div className="flex-1 max-w-md mx-6 hidden md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input
            type="search"
            placeholder="Search cases, documents, FIRs, evidence hashes..."
            className="w-full bg-surface-alt border border-border rounded-md pl-9 pr-4 py-1.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button
          className="text-muted hover:text-text p-1.5 rounded-md hover:bg-surface-alt transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        <div className="flex items-center space-x-2 pl-2 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-medium text-xs">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold text-text leading-tight">Officer / Demo</p>
            <p className="text-[11px] text-muted">Admin / Lead</p>
          </div>
        </div>
      </div>
    </header>
  );
};
