'use client';

import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Search,
  Share2,
  Stamp,
  ScrollText,
  ShieldAlert,
  Settings,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '#', active: true },
    { label: 'Cases & ABAC', icon: Briefcase, href: '#', badge: 'Phase 3' },
    { label: 'Documents & Storage', icon: FileText, href: '#', badge: 'Phase 4' },
    { label: 'OCR & Search', icon: Search, href: '#', badge: 'Phase 5' },
    { label: 'Controlled Sharing', icon: Share2, href: '#', badge: 'Phase 6' },
    { label: 'Signed Exports', icon: Stamp, href: '#', badge: 'Phase 7' },
    { label: 'Audit Ledger', icon: ScrollText, href: '#', badge: 'Phase 2' },
    { label: 'Integrity Check', icon: ShieldAlert, href: '#', badge: 'Live' },
    { label: 'Administration', icon: Settings, href: '#', badge: 'Admin' },
  ];

  return (
    <aside className="w-64 bg-surface border-r border-border h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
          Navigation
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  item.active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text hover:bg-surface-alt hover:text-primary'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      item.active
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-alt text-muted border border-border'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-surface-alt border border-border rounded-lg text-xs space-y-1">
        <div className="font-semibold text-text flex items-center justify-between">
          <span>Security Status</span>
          <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
        </div>
        <p className="text-muted text-[11px]">BSA 2023 §61–63 Ready</p>
        <p className="text-muted text-[11px] font-mono">Phase 0: Skeleton Active</p>
      </div>
    </aside>
  );
};
