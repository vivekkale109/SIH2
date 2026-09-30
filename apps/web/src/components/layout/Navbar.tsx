'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Search, Bell, LogOut, ChevronDown, Check, UserCheck } from 'lucide-react';
import { UserRole } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, logout, switchDemoUser } = useAuth();
  const router = useRouter();
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  const handleLogout = async (): Promise<void> => {
    await logout();
    router.push('/login');
  };

  const roles = [
    { role: UserRole.ADMIN, label: 'Admin (IT & Admin)' },
    { role: UserRole.INVESTIGATOR, label: 'Investigator (Police)' },
    { role: UserRole.PROSECUTOR, label: 'Prosecutor (State)' },
    { role: UserRole.COURT_OFFICER, label: 'Court Officer (Judiciary)' },
    { role: UserRole.RECORDS_MANAGER, label: 'Records Manager (Vault)' },
    { role: UserRole.AUDITOR, label: 'Auditor (Vigilance)' },
  ];

  return (
    <header className="h-16 border-b border-border bg-surface px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Brand & Unit */}
      <Link href="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
        <div className="bg-primary/10 text-primary p-2 rounded-lg">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <span className="font-bold text-lg text-text tracking-tight">SDMS</span>
          <span className="hidden sm:inline-block ml-2 text-xs font-medium text-muted bg-surface-alt px-2 py-0.5 rounded border border-border">
            Secure Digital Evidence & Document Ledger
          </span>
        </div>
      </Link>

      {/* Quick Global Search Bar */}
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

      {/* User Controls & Demo Role Switcher */}
      <div className="flex items-center space-x-4">
        {/* Role Switcher Pill for Demo */}
        <div className="relative">
          <button
            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
            className="flex items-center space-x-1.5 text-xs font-medium bg-surface-alt hover:bg-border/60 text-text px-3 py-1.5 rounded-md border border-border transition-colors"
            title="Switch demo persona to test RBAC"
          >
            <UserCheck className="w-3.5 h-3.5 text-primary" />
            <span className="hidden sm:inline">Role:</span>
            <span className="font-bold text-primary">{user?.role || 'Guest'}</span>
            <ChevronDown className="w-3 h-3 text-muted ml-0.5" />
          </button>

          {isRoleDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-surface border border-border rounded-lg shadow-lg py-1 z-50 text-xs">
              <div className="px-3 py-1.5 font-semibold text-muted uppercase tracking-wider text-[10px] border-b border-border">
                Switch Role Profile
              </div>
              {roles.map(({ role, label }) => (
                <button
                  key={role}
                  onClick={() => {
                    switchDemoUser(role);
                    setIsRoleDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-alt transition-colors ${
                    user?.role === role ? 'font-bold text-primary bg-primary/5' : 'text-text'
                  }`}
                >
                  <span>{label}</span>
                  {user?.role === role && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon */}
        <button
          className="text-muted hover:text-text p-1.5 rounded-md hover:bg-surface-alt transition-colors relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center space-x-3 pl-3 border-l border-border">
          <div className="hidden lg:block text-right">
            <p className="text-xs font-semibold text-text leading-tight">
              {user?.fullName || 'Demo Officer'}
            </p>
            <p className="text-[11px] text-muted font-mono">{user?.badgeNumber || 'POL-001'}</p>
          </div>

          <button
            onClick={handleLogout}
            className="text-muted hover:text-danger p-1.5 rounded-md hover:bg-surface-alt transition-colors"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
