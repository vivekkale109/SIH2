'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { UserRole, UserSummary } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

export default function UsersPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New user form state
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Secure#Demo2026!');
  const [newBadge, setNewBadge] = useState('');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.INVESTIGATOR);
  const [newDeptCode, setNewDeptCode] = useState('POL-CCB');

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('http://localhost:4000/api/v1/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || []);
        return;
      }
    } catch {
      // ignore
    }

    // Default seeded users representation
    setUsers([
      {
        id: '1',
        fullName: 'Chief Systems Administrator',
        email: 'admin@sdms.gov.in',
        badgeNumber: 'ADMIN-001',
        role: UserRole.ADMIN,
        departmentId: 'POL-CCB',
        isActive: true,
        mfaEnabled: true,
        createdAt: '2026-09-30T10:00:00Z',
        updatedAt: '2026-09-30T10:00:00Z',
      },
      {
        id: '2',
        fullName: 'Inspector Rajesh Sharma',
        email: 'investigator@police.gov.in',
        badgeNumber: 'POL-INV-4412',
        role: UserRole.INVESTIGATOR,
        departmentId: 'POL-CCB',
        isActive: true,
        mfaEnabled: false,
        createdAt: '2026-09-30T10:00:00Z',
        updatedAt: '2026-09-30T10:00:00Z',
      },
      {
        id: '3',
        fullName: 'Senior Public Prosecutor Meera Sen',
        email: 'prosecutor@prosecution.gov.in',
        badgeNumber: 'PROS-OFF-208',
        role: UserRole.PROSECUTOR,
        departmentId: 'PROS-HQ',
        isActive: true,
        mfaEnabled: false,
        createdAt: '2026-09-30T10:00:00Z',
        updatedAt: '2026-09-30T10:00:00Z',
      },
      {
        id: '4',
        fullName: 'Registrar K. V. Raman',
        email: 'court.officer@court.gov.in',
        badgeNumber: 'CRT-REG-104',
        role: UserRole.COURT_OFFICER,
        departmentId: 'CRT-SESS',
        isActive: true,
        mfaEnabled: false,
        createdAt: '2026-09-30T10:00:00Z',
        updatedAt: '2026-09-30T10:00:00Z',
      },
      {
        id: '5',
        fullName: 'Chief Records Officer Sunita Das',
        email: 'records@sdms.gov.in',
        badgeNumber: 'REC-MGR-319',
        role: UserRole.RECORDS_MANAGER,
        departmentId: 'POL-CCB',
        isActive: true,
        mfaEnabled: false,
        createdAt: '2026-09-30T10:00:00Z',
        updatedAt: '2026-09-30T10:00:00Z',
      },
      {
        id: '6',
        fullName: 'Senior Vigilance Auditor Amit Patel',
        email: 'auditor@vigilance.gov.in',
        badgeNumber: 'AUD-VIG-502',
        role: UserRole.AUDITOR,
        departmentId: 'PROS-HQ',
        isActive: true,
        mfaEnabled: false,
        createdAt: '2026-09-30T10:00:00Z',
        updatedAt: '2026-09-30T10:00:00Z',
      },
    ]);
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreateUser = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('http://localhost:4000/api/v1/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newFullName,
          email: newEmail,
          password: newPassword,
          badgeNumber: newBadge || undefined,
          role: newRole,
          departmentId: newDeptCode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Failed to create user' }));
        throw new Error(errorData.message || 'Creation failed');
      }

      await fetchUsers();
      setIsCreateModalOpen(false);
      setNewFullName('');
      setNewEmail('');
      setNewBadge('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.badgeNumber && u.badgeNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const getRoleBadgeColor = (r: UserRole): string => {
    switch (r) {
      case UserRole.ADMIN:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case UserRole.INVESTIGATOR:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case UserRole.PROSECUTOR:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case UserRole.COURT_OFFICER:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
      case UserRole.RECORDS_MANAGER:
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300';
      case UserRole.AUDITOR:
        return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">User Accounts & RBAC Roles</h1>
          <p className="text-xs text-muted mt-1">
            Manage authenticated law enforcement, judicial, and vigilance officers with strict role
            separation
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Read-only view. Only the System Administrator can provision users or alter role
            assignments.
          </span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-surface border border-border rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="search"
            placeholder="Search by name, email, or badge number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-surface-alt border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-text focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          <span className="text-xs font-medium text-muted shrink-0">Filter Role:</span>
          {['ALL', ...Object.values(UserRole)].map((roleKey) => (
            <button
              key={roleKey}
              onClick={() => setRoleFilter(roleKey)}
              className={`text-xs px-2.5 py-1 rounded-md transition-colors shrink-0 ${
                roleFilter === roleKey
                  ? 'bg-primary text-white font-semibold'
                  : 'bg-surface-alt text-muted hover:text-text border border-border'
              }`}
            >
              {roleKey}
            </button>
          ))}
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-alt text-muted uppercase font-semibold border-b border-border text-[11px]">
              <tr>
                <th className="py-3 px-4">Officer / User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Badge / ID</th>
                <th className="py-3 px-4 text-center">MFA Status</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Provisioned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-surface-alt/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-text">{u.fullName}</div>
                    <div className="text-[11px] text-muted font-mono">{u.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadgeColor(u.role)}`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-muted font-medium">{u.departmentId}</td>
                  <td className="py-3 px-4 font-mono text-text">{u.badgeNumber || '—'}</td>
                  <td className="py-3 px-4 text-center">
                    {u.mfaEnabled ? (
                      <span className="inline-flex items-center space-x-1 text-success text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Enabled</span>
                      </span>
                    ) : (
                      <span className="text-muted text-[11px]">Disabled</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {u.isActive ? (
                      <span className="inline-flex items-center space-x-1 text-success font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-danger font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Disabled</span>
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right text-muted font-mono">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    No users found matching query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center space-x-2 text-text font-bold text-base">
                <Users className="w-5 h-5 text-primary" />
                <span>Provision New User Account</span>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-muted hover:text-text p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-text mb-1">Full Legal Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sub-Inspector Alok Verma"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">Official Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="alok.verma@police.gov.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Initial Password (Argon2id Enforced)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[10px] text-muted mt-1">
                  Requires 12+ chars, uppercase, lowercase, number, symbol.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-text mb-1">Role Profile</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.values(UserRole).map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-text mb-1">Department</label>
                  <select
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="POL-CCB">Police (Central Crime)</option>
                    <option value="POL-CYBER">Police (Cyber Cell)</option>
                    <option value="PROS-HQ">Prosecution Directorate</option>
                    <option value="CRT-SESS">Principal Sessions Court</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-text mb-1">
                  Badge / Officer ID Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. POL-INV-5590"
                  value={newBadge}
                  onChange={(e) => setNewBadge(e.target.value)}
                  className="w-full bg-surface-alt border border-border rounded-lg px-3 py-2 text-text font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-muted hover:bg-surface-alt transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
