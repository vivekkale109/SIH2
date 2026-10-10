'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Clock,
  Shield,
  User,
  Building,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { ShareScope, UserRole, UserSummary, DepartmentSummary } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  prefilledResourceType?: 'CASE' | 'DOCUMENT';
  prefilledResourceId?: string;
  prefilledResourceTitle?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefilledResourceType = 'CASE',
  prefilledResourceId = '',
  prefilledResourceTitle = '',
}) => {
  const { token, user } = useAuth();

  const [resourceType, setResourceType] = useState<'CASE' | 'DOCUMENT'>(prefilledResourceType);
  const [resourceId, setResourceId] = useState<string>(prefilledResourceId);
  const [resourceTitle, setResourceTitle] = useState<string>(prefilledResourceTitle);

  const [targetType, setTargetType] = useState<'USER' | 'DEPARTMENT'>('USER');
  const [granteeId, setGranteeId] = useState<string>('');
  const [granteeDepartmentId, setGranteeDepartmentId] = useState<string>('POL-CCB');
  const [scope, setScope] = useState<ShareScope>(ShareScope.VIEW_ONLY);

  const [expirationPreset, setExpirationPreset] = useState<string>('24h');
  const [customExpiresAt, setCustomExpiresAt] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('Secure#Demo2026!');

  const [usersList, setUsersList] = useState<UserSummary[]>([]);
  const [deptList, setDeptList] = useState<DepartmentSummary[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdShare, setCreatedShare] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (prefilledResourceType) setResourceType(prefilledResourceType);
    if (prefilledResourceId) setResourceId(prefilledResourceId);
    if (prefilledResourceTitle) setResourceTitle(prefilledResourceTitle);
  }, [prefilledResourceType, prefilledResourceId, prefilledResourceTitle]);

  // Load available users and departments for grantee selection
  useEffect(() => {
    if (!isOpen) return;

    const loadUsersAndDepts = async () => {
      try {
        const [usersRes, deptsRes] = await Promise.all([
          fetch('/api/v1/users', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/v1/users/departments', { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        if (usersRes.ok) {
          const data = await usersRes.json();
          const items: UserSummary[] = data.items || [];
          // Filter out current user from grantees
          const filtered = items.filter((u) => u.id !== user?.id);
          setUsersList(filtered);
          if (filtered.length > 0 && !granteeId) {
            setGranteeId(filtered[0].id);
          }
        }

        if (deptsRes.ok) {
          const depts: DepartmentSummary[] = await deptsRes.json();
          setDeptList(depts);
          if (depts.length > 0) {
            setGranteeDepartmentId(depts[0].id);
          }
        }
      } catch {
        // Fallback demo users if fetch fails
        const demoUsers: UserSummary[] = [
          {
            id: 'demo-court-id',
            email: 'court.officer@court.gov.in',
            fullName: 'Registrar K. V. Raman',
            badgeNumber: 'CRT-REG-099',
            role: UserRole.COURT_OFFICER,
            departmentId: 'CRT-DELHI',
            isActive: true,
            mfaEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'demo-prosecutor-id',
            email: 'prosecutor@prosecution.gov.in',
            fullName: 'Senior Public Prosecutor Meera Sen',
            badgeNumber: 'PROS-OFF-208',
            role: UserRole.PROSECUTOR,
            departmentId: 'PROS-HQ',
            isActive: true,
            mfaEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        setUsersList(demoUsers);
        if (!granteeId && demoUsers.length > 0) setGranteeId(demoUsers[0].id);
      }
    };

    loadUsersAndDepts();
  }, [isOpen, token, user?.id]);

  if (!isOpen) return null;

  // Calculate ISO expiration string
  const calculateExpiresAt = (): string => {
    const now = new Date();
    switch (expirationPreset) {
      case '1h':
        return new Date(now.getTime() + 1 * 60 * 60 * 1000).toISOString();
      case '24h':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      case '7d':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      case 'custom':
        return customExpiresAt
          ? new Date(customExpiresAt).toISOString()
          : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!resourceId.trim()) {
      setErrorMsg('Please specify a valid Resource UUID.');
      return;
    }

    if (targetType === 'USER' && !granteeId) {
      setErrorMsg('Please select a recipient user.');
      return;
    }

    if (targetType === 'DEPARTMENT' && !granteeDepartmentId) {
      setErrorMsg('Please select a recipient department.');
      return;
    }

    setIsSubmitting(true);

    try {
      const expiresAt = calculateExpiresAt();
      const payload: any = {
        resourceType,
        resourceId: resourceId.trim(),
        scope,
        expiresAt,
        passwordConfirm,
      };

      if (targetType === 'USER') {
        payload.granteeId = granteeId;
      } else {
        payload.granteeDepartmentId = granteeDepartmentId;
      }

      const res = await fetch('/api/v1/shares', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ message: 'Failed to create share grant' }));
        throw new Error(data.message || 'Share creation failed');
      }

      const created = await res.json();
      setCreatedShare(created);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to establish controlled share');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdShare) return;
    const shareLink = `${window.location.origin}/shares?id=${createdShare.id}`;
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setCreatedShare(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-alt">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">Create Controlled Share Grant</h2>
              <p className="text-xs text-muted">
                Scoped, time-limited cross-department access with forensic watermarking
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border/40 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {createdShare ? (
            /* Success Receipt View */
            <div className="space-y-4 py-2">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-bold text-text">Share Grant Issued Successfully</h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  A tamper-evident{' '}
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    SHARE_CREATED
                  </span>{' '}
                  entry has been permanently recorded on the hash-chained audit ledger.
                </p>
              </div>

              <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted">Share Grant ID:</span>
                  <span className="font-mono text-[11px] font-bold text-text">
                    {createdShare.id}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted">Resource:</span>
                  <span className="font-semibold text-text">
                    {createdShare.resourceType} •{' '}
                    {createdShare.resourceTitle ||
                      resourceTitle ||
                      createdShare.resourceId.slice(0, 8)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted">Access Scope:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      createdShare.scope === ShareScope.DOWNLOAD
                        ? 'bg-purple-500/20 text-purple-600 border border-purple-500/30'
                        : 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                    }`}
                  >
                    {createdShare.scope}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border/50">
                  <span className="text-muted">Recipient:</span>
                  <span className="font-semibold text-text">
                    {createdShare.grantee?.fullName ||
                      createdShare.granteeDepartment?.name ||
                      'Department / User'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted">Expires At:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {new Date(createdShare.expiresAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-primary">
                  <Shield className="w-4 h-4" />
                  Forensic Dynamic Watermarking Enabled
                </div>
                <p className="text-muted text-[11px] leading-relaxed">
                  Every viewing and download session by the recipient will dynamically embed the
                  recipient&apos;s identity, badge, access timestamp, and case reference directly
                  across pages and image pixels.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-4 bg-surface-alt border border-border rounded-xl text-xs font-semibold text-text hover:bg-border/40 transition flex items-center justify-center gap-1.5"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copied ? 'Share Link Copied!' : 'Copy Direct Share Link'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2.5 px-5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Resource Indicator */}
              <div className="p-3.5 bg-surface-alt border border-border rounded-xl space-y-1">
                <div className="text-[10px] font-mono text-muted uppercase tracking-wider">
                  Target Resource to Share
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {resourceType === 'CASE' ? (
                      <Briefcase className="w-4 h-4 text-primary" />
                    ) : (
                      <FileText className="w-4 h-4 text-primary" />
                    )}
                    <span className="text-xs font-bold text-text">
                      {resourceTitle ||
                        (resourceType === 'CASE' ? 'Investigation Case File' : 'Evidence Document')}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                    {resourceType}
                  </span>
                </div>
                {!prefilledResourceId && (
                  <input
                    type="text"
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    placeholder="Enter Resource UUID..."
                    className="w-full mt-2 bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-primary"
                    required
                  />
                )}
              </div>

              {/* Recipient Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-text flex items-center justify-between">
                  <span>Grantee Type</span>
                  <div className="flex items-center bg-surface-alt border border-border rounded-lg p-0.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setTargetType('USER')}
                      className={`px-2.5 py-1 rounded font-semibold transition ${
                        targetType === 'USER'
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-muted hover:text-text'
                      }`}
                    >
                      <User className="w-3 h-3 inline mr-1" />
                      Individual User
                    </button>
                    <button
                      type="button"
                      onClick={() => setTargetType('DEPARTMENT')}
                      className={`px-2.5 py-1 rounded font-semibold transition ${
                        targetType === 'DEPARTMENT'
                          ? 'bg-primary text-white shadow-sm'
                          : 'text-muted hover:text-text'
                      }`}
                    >
                      <Building className="w-3 h-3 inline mr-1" />
                      Department
                    </button>
                  </div>
                </label>

                {targetType === 'USER' ? (
                  <select
                    value={granteeId}
                    onChange={(e) => setGranteeId(e.target.value)}
                    className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2 text-xs text-text focus:outline-none focus:border-primary"
                    required
                  >
                    <option value="">-- Select Recipient User --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName} ({u.role}) • {u.email} [Dept: {u.departmentId}]
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={granteeDepartmentId}
                    onChange={(e) => setGranteeDepartmentId(e.target.value)}
                    className="w-full bg-surface-alt border border-border rounded-xl px-3.5 py-2 text-xs text-text focus:outline-none focus:border-primary"
                    required
                  >
                    {deptList.length > 0 ? (
                      deptList.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code}) • {d.type}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="POL-CCB">Central Crime Branch (POLICE)</option>
                        <option value="PROS-HQ">Prosecution Directorate (PROSECUTION)</option>
                        <option value="CRT-DELHI">Principal Sessions Court (COURT)</option>
                        <option value="FOR-CENTRAL">
                          Central Forensic Science Lab (FORENSIC_LAB)
                        </option>
                      </>
                    )}
                  </select>
                )}
              </div>

              {/* Access Scope */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text">Access Scope</label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() => setScope(ShareScope.VIEW_ONLY)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      scope === ShareScope.VIEW_ONLY
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border bg-surface-alt text-muted hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">VIEW ONLY</span>
                      <Shield className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-snug">
                      Inline browser watermarked preview only. File downloads are blocked.
                    </p>
                  </div>

                  <div
                    onClick={() => setScope(ShareScope.DOWNLOAD)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      scope === ShareScope.DOWNLOAD
                        ? 'border-purple-500 bg-purple-500/5 text-purple-600'
                        : 'border-border bg-surface-alt text-muted hover:border-border/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">DOWNLOAD</span>
                      <Share2 className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-snug">
                      Recipient may preview and download watermarked evidence files.
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Limit / Expiry Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text flex items-center justify-between">
                  <span>Access Duration / Expiration</span>
                  <span className="text-[11px] font-mono text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Auto-Revoking
                  </span>
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: '1h', label: '1 Hour' },
                    { key: '24h', label: '24 Hours' },
                    { key: '7d', label: '7 Days' },
                    { key: '30d', label: '30 Days' },
                    { key: 'custom', label: 'Custom' },
                  ].map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setExpirationPreset(p.key)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition ${
                        expirationPreset === p.key
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-surface-alt text-muted hover:text-text'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {expirationPreset === 'custom' && (
                  <input
                    type="datetime-local"
                    value={customExpiresAt}
                    onChange={(e) => setCustomExpiresAt(e.target.value)}
                    className="w-full mt-2 bg-surface-alt border border-border rounded-lg px-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary"
                    required
                  />
                )}
              </div>

              {/* Re-Authentication Requirement */}
              <div className="p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Lock className="w-3.5 h-3.5" />
                  Security Re-Authentication Required
                </div>
                <p className="text-[11px] text-muted leading-tight">
                  Cross-department sharing creates an audited legal chain of custody. Confirm your
                  password to verify user presence:
                </p>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />
                  <input
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Enter current password..."
                    className="w-full bg-surface border border-border rounded-lg pl-8 pr-3 py-1.5 text-xs text-text focus:outline-none focus:border-primary font-mono"
                    required
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-border rounded-xl text-xs font-semibold text-muted hover:text-text hover:bg-border/30 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  {isSubmitting ? (
                    'Issuing Share...'
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      Grant Access
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
