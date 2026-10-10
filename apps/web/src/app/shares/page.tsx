'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Share2,
  Shield,
  Clock,
  Briefcase,
  FileText,
  User,
  Building,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Eye,
  Trash2,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ShareScope, ShareGrantDetailSummary, UserRole } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';
import { ShareModal } from '@/components/sharing/ShareModal';
import { WatermarkPreviewModal } from '@/components/sharing/WatermarkPreviewModal';

export default function SharesPage() {
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>(
    'ACTIVE',
  );
  const [resourceFilter, setResourceFilter] = useState<'ALL' | 'CASE' | 'DOCUMENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [shares, setShares] = useState<ShareGrantDetailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
    scope: ShareScope;
    caseNumber?: string;
  } | null>(null);

  // Access Inspection Modal State
  const [accessResult, setAccessResult] = useState<{
    share: ShareGrantDetailSummary;
    resource: Record<string, any>;
  } | null>(null);
  const [isAccessingId, setIsAccessingId] = useState<string | null>(null);

  // Revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchShares = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const params = new URLSearchParams();
      params.append('direction', activeTab);
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (resourceFilter !== 'ALL') {
        params.append('resourceType', resourceFilter);
      }

      const res = await fetch(`/api/v1/shares?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch shares' }));
        throw new Error(err.message || 'Unable to retrieve share grants');
      }

      const data: ShareGrantDetailSummary[] = await res.json();
      setShares(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with sharing service');
      setShares([]);
    } finally {
      setLoading(false);
    }
  }, [token, activeTab, statusFilter, resourceFilter]);

  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Handle Revoking a Share
  const handleRevoke = async (shareId: string) => {
    if (
      !confirm(
        'Are you sure you want to revoke this share grant immediately? The grantee will instantly lose all access.',
      )
    ) {
      return;
    }

    setRevokingId(shareId);
    try {
      const res = await fetch(`/api/v1/shares/${shareId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Revocation failed' }));
        alert(err.message || 'Failed to revoke share grant');
        return;
      }

      // Refresh list
      fetchShares();
    } catch {
      alert('Network error while revoking share');
    } finally {
      setRevokingId(null);
    }
  };

  // Handle Accessing / Inspecting a Shared Resource
  const handleAccess = async (share: ShareGrantDetailSummary) => {
    setIsAccessingId(share.id);
    try {
      const res = await fetch(`/api/v1/shares/${share.id}/access`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Access denied' }));
        alert(`Access Error: ${err.message || 'Share is no longer valid or has expired'}`);
        fetchShares();
        return;
      }

      const data = await res.json();
      setAccessResult(data);
    } catch {
      alert('Error verifying access clearance');
    } finally {
      setIsAccessingId(null);
    }
  };

  // Filtered in-memory search
  const filteredShares = shares.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (s.resourceTitle || '').toLowerCase().includes(q);
    const caseMatch = (s.resourceCaseNumber || '').toLowerCase().includes(q);
    const granterMatch = (s.granter?.fullName || '').toLowerCase().includes(q);
    const granteeMatch = (s.grantee?.fullName || '').toLowerCase().includes(q);
    return titleMatch || caseMatch || granterMatch || granteeMatch;
  });

  const getScopeBadge = (scope: ShareScope) => {
    if (scope === ShareScope.DOWNLOAD) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          <Download className="w-3 h-3" />
          DOWNLOAD
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
        <Eye className="w-3 h-3" />
        VIEW ONLY
      </span>
    );
  };

  const getStatusBadge = (share: ShareGrantDetailSummary) => {
    if (share.isRevoked) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
          <XCircle className="w-3 h-3" />
          REVOKED
        </span>
      );
    }
    if (share.isExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <Clock className="w-3 h-3" />
          EXPIRED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
        <CheckCircle2 className="w-3 h-3" />
        ACTIVE
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary font-mono uppercase">
              Phase 6 Operational
            </span>
            <span className="text-xs text-muted">• Cross-Agency Evidence Collaboration</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-1.5 flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-primary" />
            Controlled Sharing & Forensic Watermarking
          </h1>
          <p className="text-muted text-xs mt-1 max-w-2xl leading-relaxed">
            Time-limited, scoped access grants for legal and investigative files. Every view and
            download session dynamically embeds recipient credentials, timestamps, and case
            identifiers to prevent unauthorized leakages.
          </p>
        </div>

        <button
          onClick={() => setIsShareModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Share Grant
        </button>
      </div>

      {/* Feature Highlights Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-text">Dynamic Watermarks</div>
            <div className="text-[11px] text-muted">User, badge & timestamp stamped</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-text">Access Expiration</div>
            <div className="text-[11px] text-muted">Real-time instant cut-off</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-text">Scoped Clearance</div>
            <div className="text-[11px] text-muted">VIEW_ONLY vs DOWNLOAD options</div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-text">Audit Traceability</div>
            <div className="text-[11px] text-muted">SHARE_CREATED, REVOKED, ACCESSED</div>
          </div>
        </div>
      </div>

      {/* Main Tabs and Filter Control Bar */}
      <div className="bg-surface border border-border rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Main Direction Tabs */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('RECEIVED')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'RECEIVED'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-alt text-muted hover:text-text border border-border'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Shared with Me / Department
            </button>

            <button
              onClick={() => setActiveTab('SENT')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
                activeTab === 'SENT'
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface-alt text-muted hover:text-text border border-border'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Issued by Me / Department
            </button>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={fetchShares}
            disabled={loading}
            className="p-2 text-muted hover:text-text rounded-lg border border-border hover:bg-surface-alt transition flex items-center gap-1.5 text-xs font-semibold self-end md:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-primary' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, case number, or party..."
              className="w-full bg-surface-alt border border-border rounded-xl pl-9 pr-3 py-2 text-xs text-text focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter */}
            <div className="flex items-center bg-surface-alt border border-border rounded-xl p-0.5 text-xs font-semibold">
              {(['ACTIVE', 'ALL', 'EXPIRED', 'REVOKED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    statusFilter === st
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Resource Type Filter */}
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value as any)}
              className="bg-surface-alt border border-border rounded-xl px-3 py-2 text-xs text-text focus:outline-none focus:border-primary font-semibold"
            >
              <option value="ALL">All Resources</option>
              <option value="CASE">Cases Only</option>
              <option value="DOCUMENT">Documents Only</option>
            </select>
          </div>
        </div>

        {/* Shares Table / List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-muted flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-primary" />
            Loading controlled share grants from ledger...
          </div>
        ) : errorMsg ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center text-xs text-rose-600">
            {errorMsg}
          </div>
        ) : filteredShares.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-surface-alt/30 border border-dashed border-border rounded-xl">
            <Share2 className="w-10 h-10 text-muted mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-text">No Share Grants Found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {activeTab === 'RECEIVED'
                ? 'No documents or cases have been shared with you or your department matching the current criteria.'
                : 'You have not issued any active share grants matching these filters.'}
            </p>
            {activeTab === 'SENT' && (
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Share
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-[11px] font-bold text-muted uppercase tracking-wider bg-surface-alt/50">
                  <th className="py-3 px-4">Shared Resource</th>
                  <th className="py-3 px-4">
                    {activeTab === 'RECEIVED' ? 'Granted By' : 'Recipient'}
                  </th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4">Expiration / Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredShares.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-alt/40 transition">
                    {/* Resource Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          {s.resourceType === 'CASE' ? (
                            <Briefcase className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-text flex items-center gap-1.5">
                            <span>
                              {s.resourceTitle || `${s.resourceType} ${s.resourceId.slice(0, 8)}`}
                            </span>
                            <span className="font-mono text-[9px] bg-surface-alt px-1.5 py-0.5 rounded border border-border text-muted">
                              {s.resourceType}
                            </span>
                          </div>
                          {s.resourceCaseNumber && (
                            <div className="text-[11px] font-mono text-primary font-semibold mt-0.5">
                              {s.resourceCaseNumber}
                            </div>
                          )}
                          <div className="text-[10px] text-muted font-mono mt-0.5">
                            ID: {s.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Party Column */}
                    <td className="py-3.5 px-4">
                      {activeTab === 'RECEIVED' ? (
                        <div>
                          <div className="font-semibold text-text">
                            {s.granter?.fullName || 'Investigation Officer'}
                          </div>
                          <div className="text-[11px] text-muted">
                            {s.granter?.role} • {s.granter?.departmentId || 'Police CCB'}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-semibold text-text">
                            {s.grantee?.fullName ||
                              s.granteeDepartment?.name ||
                              s.granteeDepartmentId ||
                              'Target Recipient'}
                          </div>
                          <div className="text-[11px] text-muted">
                            {s.grantee?.role ||
                              (s.granteeDepartmentId ? 'Department Scope' : 'External Access')}
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Scope Column */}
                    <td className="py-3.5 px-4">{getScopeBadge(s.scope)}</td>

                    {/* Expiration Column */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div>{getStatusBadge(s)}</div>
                        <div className="text-[11px] font-mono text-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(s.expiresAt).toLocaleString()}
                        </div>
                      </div>
                    </td>

                    {/* Action Column */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {activeTab === 'RECEIVED' ? (
                          <>
                            {/* Inspect Access */}
                            <button
                              onClick={() => handleAccess(s)}
                              disabled={isAccessingId === s.id || s.isExpired || s.isRevoked}
                              className="px-2.5 py-1.5 bg-surface-alt hover:bg-border/40 disabled:opacity-40 text-text border border-border rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              title="Verify access and log audit access event"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Inspect
                            </button>

                            {/* View / Watermark Preview for Document */}
                            {s.resourceType === 'DOCUMENT' && (
                              <button
                                onClick={() =>
                                  setPreviewDoc({
                                    id: s.resourceId,
                                    title: s.resourceTitle || 'Shared Evidence',
                                    scope: s.scope,
                                    caseNumber: s.resourceCaseNumber,
                                  })
                                }
                                disabled={s.isExpired || s.isRevoked}
                                className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 disabled:opacity-40 text-primary border border-primary/20 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Preview
                              </button>
                            )}

                            {/* Case Link */}
                            {s.resourceType === 'CASE' && (
                              <Link
                                href={`/cases/${s.resourceId}`}
                                className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              >
                                View Case
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Revoke Action for Issued Shares */}
                            {!s.isRevoked && !s.isExpired ? (
                              <button
                                onClick={() => handleRevoke(s.id)}
                                disabled={revokingId === s.id}
                                className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                {revokingId === s.id ? 'Revoking...' : 'Revoke'}
                              </button>
                            ) : (
                              <span className="text-[11px] text-muted italic">Inactive</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Access Clearance Inspection Modal */}
      {accessResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-bold text-text">Access Authorized & Recorded</h3>
              </div>
              <button
                onClick={() => setAccessResult(null)}
                className="text-muted hover:text-text p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
              A <strong>SHARE_ACCESSED</strong> event has been committed to the tamper-evident audit
              ledger with your credentials and timestamp.
            </div>

            <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Resource:</span>
                <span className="font-bold text-text">
                  {accessResult.share.resourceType} • {accessResult.share.resourceTitle}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Scope Granted:</span>
                <span className="font-bold">{accessResult.share.scope}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span className="text-muted">Granted By:</span>
                <span className="font-semibold text-text">
                  {accessResult.share.granter?.fullName}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Valid Until:</span>
                <span className="font-mono text-amber-600 font-bold">
                  {new Date(accessResult.share.expiresAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setAccessResult(null)}
                className="px-4 py-2 bg-surface-alt border border-border rounded-xl text-xs font-semibold text-text hover:bg-border/40 transition"
              >
                Close
              </button>

              {accessResult.share.resourceType === 'DOCUMENT' && (
                <button
                  onClick={() => {
                    const s = accessResult.share;
                    setAccessResult(null);
                    setPreviewDoc({
                      id: s.resourceId,
                      title: s.resourceTitle || 'Shared Document',
                      scope: s.scope,
                      caseNumber: s.resourceCaseNumber,
                    });
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Open Watermarked Preview
                </button>
              )}

              {accessResult.share.resourceType === 'CASE' && (
                <Link
                  href={`/cases/${accessResult.share.resourceId}`}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                >
                  Open Investigation File
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Share Creation Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        onSuccess={() => {
          fetchShares();
        }}
      />

      {/* Watermarked Preview Modal */}
      {previewDoc && (
        <WatermarkPreviewModal
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
          documentId={previewDoc.id}
          documentTitle={previewDoc.title}
          scope={previewDoc.scope}
          caseNumber={previewDoc.caseNumber}
        />
      )}
    </div>
  );
}
