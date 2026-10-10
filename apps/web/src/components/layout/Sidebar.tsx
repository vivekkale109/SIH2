'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Building2,
  ShieldAlert,
  Settings,
  Briefcase,
  Upload,
  Search,
  Share2,
  FileCheck2,
  Archive,
  Clock,
  Layers,
  ScrollText,
} from 'lucide-react';
import { UserRole } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const currentRole = user?.role || UserRole.ADMIN;

  // Role-based navigation mapping according to Design.md Section 6
  const getNavItemsForRole = (role: UserRole): NavItem[] => {
    switch (role) {
      case UserRole.ADMIN:
        return [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
          { label: 'Cases & Records', icon: Briefcase, href: '/cases', badge: 'Phase 3' },
          { label: 'Upload Evidence', icon: Upload, href: '/upload', badge: 'Phase 4' },
          { label: 'OCR & Search', icon: Search, href: '/search', badge: 'Phase 5' },
          { label: 'Controlled Shares', icon: Share2, href: '/shares', badge: 'Phase 6' },
          { label: 'Verify Package', icon: FileCheck2, href: '/verify', badge: 'BSA 2023' },
          { label: 'Users & RBAC', icon: Users, href: '/users', badge: 'Admin' },
          { label: 'Departments', icon: Building2, href: '/departments' },
          { label: 'Audit Ledger', icon: ScrollText, href: '/audit', badge: 'Phase 2' },
          { label: 'System Settings', icon: Settings, href: '/settings' },
        ];
      case UserRole.INVESTIGATOR:
        return [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
          { label: 'My Cases', icon: Briefcase, href: '/cases', badge: 'Phase 3' },
          { label: 'Upload Evidence', icon: Upload, href: '/upload', badge: 'Phase 4' },
          { label: 'OCR & Search', icon: Search, href: '/search', badge: 'Phase 5' },
          { label: 'Shared with Me', icon: Share2, href: '/shares', badge: 'Phase 6' },
          { label: 'Verify Package', icon: FileCheck2, href: '/verify', badge: 'BSA 2023' },
        ];
      case UserRole.PROSECUTOR:
        return [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
          { label: 'Case Files', icon: Briefcase, href: '/cases', badge: 'Phase 3' },
          { label: 'Shared with Me', icon: Share2, href: '/shares', badge: 'Phase 6' },
          { label: 'Search Evidence', icon: Search, href: '/search', badge: 'Phase 5' },
          { label: 'Signed Exports', icon: FileCheck2, href: '/exports', badge: 'Phase 7' },
        ];
      case UserRole.COURT_OFFICER:
        return [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
          { label: 'Search Records', icon: Search, href: '/search', badge: 'Phase 5' },
          { label: 'Shared with Court', icon: Share2, href: '/shares', badge: 'Phase 6' },
          { label: 'Verify Export', icon: FileCheck2, href: '/verify', badge: 'BSA 2023' },
        ];
      case UserRole.RECORDS_MANAGER:
        return [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
          { label: 'Cases Archive', icon: Briefcase, href: '/cases', badge: 'Phase 3' },
          { label: 'OCR & Search', icon: Search, href: '/search', badge: 'Phase 5' },
          { label: 'Records Vault', icon: Archive, href: '/records', badge: 'Phase 4' },
          { label: 'Retention Policies', icon: Clock, href: '/retention', badge: 'Phase 8' },
          { label: 'Classification Rules', icon: Layers, href: '/classification' },
        ];
      case UserRole.AUDITOR:
        return [
          { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
          { label: 'Audit Log Ledger', icon: ScrollText, href: '/audit', badge: 'Phase 2' },
          { label: 'Case Inspection', icon: Briefcase, href: '/cases', badge: 'Phase 3' },
          { label: 'OCR & Search', icon: Search, href: '/search', badge: 'Phase 5' },
          {
            label: 'Chain Integrity Report',
            icon: ShieldAlert,
            href: '/integrity',
            badge: 'Tamper-Check',
          },
        ];
      default:
        return [{ label: 'Dashboard', icon: LayoutDashboard, href: '/' }];
    }
  };

  const navItems = getNavItemsForRole(currentRole);

  return (
    <aside className="w-64 bg-surface border-r border-border h-[calc(100vh-4rem)] flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-4">
        {/* Active Role Indicator */}
        <div className="bg-surface-alt border border-border rounded-lg p-3">
          <div className="text-[10px] font-mono text-muted uppercase tracking-wider">
            Active Role Access
          </div>
          <div className="text-xs font-bold text-text mt-0.5 flex items-center justify-between">
            <span>{currentRole}</span>
            <span className="w-2 h-2 rounded-full bg-success"></span>
          </div>
          <div className="text-[11px] text-muted truncate mt-0.5">
            {user?.departmentId || 'Department of Police'}
          </div>
        </div>

        {/* Dynamic Navigation Menu */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
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
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-surface-alt text-muted border border-border'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Security Status Box */}
      <div className="p-3 bg-surface-alt border border-border rounded-lg text-xs space-y-1">
        <div className="font-semibold text-text flex items-center justify-between">
          <span>Security Guard</span>
          <span className="inline-block w-2 h-2 rounded-full bg-success"></span>
        </div>
        <p className="text-muted text-[11px]">RBAC + MFA Enforced</p>
        <p className="text-muted text-[11px] font-mono">BSA 2023 §61–63 Standard</p>
      </div>
    </aside>
  );
};
