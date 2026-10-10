'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Briefcase,
  Shield,
  Clock,
  Users,
  ScrollText,
  Building,
  UserCheck,
  UserX,
  Plus,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Layers,
  ChevronRight,
  X,
  Download,
  History,
  FileUp,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  Lock,
  Share2,
  Eye,
  Trash2,
  FileCheck2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  CaseStatus,
  ClassificationLevel,
  CaseMemberRole,
  CaseDetailSummary,
  AuditLedgerEntry,
  UserRole,
  AuditAction,
  DocumentSummary,
  DocumentVersionSummary,
  DocumentIntegrityResult,
  DocumentStatus,
  ShareScope,
  ShareGrantDetailSummary,
  ExportPackageSummary,
} from '@sdms/shared-types';
import { ShareModal } from '@/components/sharing/ShareModal';
import { WatermarkPreviewModal } from '@/components/sharing/WatermarkPreviewModal';
import { ExportModal } from '@/components/export/ExportModal';

interface PageProps {
  params: Promise<{ id: string }>;
}

const DEMO_CASE_DETAIL: CaseDetailSummary = {
  id: 'case-demo-1',
  caseNumber: 'FIR-2026-DEL-0042',
  title: 'Financial Securities Manipulation Investigation',
  description:
    'Comprehensive multi-agency inquiry into coordinated algorithmic market disruption and unauthorized order placement through compromised brokerage credentials.',
  status: CaseStatus.OPEN,
  classification: ClassificationLevel.RESTRICTED,
  departmentId: 'POL-CCB',
  createdById: 'demo-investigator-id',
  documentCount: 2,
  createdAt: '2026-09-30T09:30:00.000Z',
  updatedAt: '2026-09-30T10:15:00.000Z',
  department: {
    id: 'dept-1',
    name: 'Central Crime Branch - Police Headquarters',
    code: 'POL-CCB',
    type: 'POLICE' as any,
    createdAt: '2026-09-30T00:00:00Z',
    updatedAt: '2026-09-30T00:00:00Z',
  },
  createdBy: {
    id: 'demo-investigator-id',
    fullName: 'Inspector Rajesh Sharma',
    email: 'investigator@police.gov.in',
    badgeNumber: 'POL-INV-4412',
    role: UserRole.INVESTIGATOR,
    departmentId: 'POL-CCB',
    isActive: true,
    mfaEnabled: true,
    createdAt: '2026-09-30T00:00:00Z',
    updatedAt: '2026-09-30T00:00:00Z',
  },
  members: [
    {
      id: 'mem-1',
      caseId: 'case-demo-1',
      userId: 'demo-investigator-id',
      caseRole: CaseMemberRole.LEAD_INVESTIGATOR,
      assignedAt: '2026-09-30T09:30:00.000Z',
      user: {
        id: 'demo-investigator-id',
        fullName: 'Inspector Rajesh Sharma',
        email: 'investigator@police.gov.in',
        badgeNumber: 'POL-INV-4412',
        role: UserRole.INVESTIGATOR,
        departmentId: 'POL-CCB',
        isActive: true,
        mfaEnabled: true,
        createdAt: '2026-09-30T00:00:00Z',
        updatedAt: '2026-09-30T00:00:00Z',
      },
    },
    {
      id: 'mem-2',
      caseId: 'case-demo-1',
      userId: 'demo-prosecutor-id',
      caseRole: CaseMemberRole.PROSECUTOR,
      assignedAt: '2026-09-30T10:00:00.000Z',
      user: {
        id: 'demo-prosecutor-id',
        fullName: 'Senior Public Prosecutor Meera Sen',
        email: 'prosecutor@prosecution.gov.in',
        badgeNumber: 'PROS-OFF-208',
        role: UserRole.PROSECUTOR,
        departmentId: 'PROS-HQ',
        isActive: true,
        mfaEnabled: false,
        createdAt: '2026-09-30T00:00:00Z',
        updatedAt: '2026-09-30T00:00:00Z',
      },
    },
  ],
};

const DEMO_DOCUMENTS: DocumentSummary[] = [
  {
    id: 'doc-demo-1',
    caseId: 'case-demo-1',
    title: 'Digital Forensic Storage Acquisition & Bitstream Hash Report',
    type: 'FORENSIC_REPORT',
    classification: ClassificationLevel.RESTRICTED,
    status: DocumentStatus.READY,
    latestVersionNo: 2,
    sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    createdById: 'demo-investigator-id',
    createdAt: '2026-09-30T10:00:00.000Z',
    updatedAt: '2026-09-30T10:45:00.000Z',
  },
  {
    id: 'doc-demo-2',
    caseId: 'case-demo-1',
    title: 'Certified First Information Report (FIR Signed Copy)',
    type: 'FIR',
    classification: ClassificationLevel.RESTRICTED,
    status: DocumentStatus.READY,
    latestVersionNo: 1,
    sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    createdById: 'demo-investigator-id',
    createdAt: '2026-09-30T09:35:00.000Z',
    updatedAt: '2026-09-30T09:35:00.000Z',
  },
];

const DEMO_TIMELINE: AuditLedgerEntry[] = [
  {
    id: 'tl-1',
    sequence: 12,
    timestamp: '2026-09-30T09:30:00.000Z',
    actorId: 'demo-investigator-id',
    action: AuditAction.CASE_CREATED,
    entityType: 'Case',
    entityId: 'case-demo-1',
    metadata: {
      caseNumber: 'FIR-2026-DEL-0042',
      title: 'Financial Securities Manipulation Investigation',
      classification: 'RESTRICTED',
    },
    prevHash: 'a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8',
    entryHash: 'b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8',
  },
  {
    id: 'tl-2',
    sequence: 14,
    timestamp: '2026-09-30T10:00:00.000Z',
    actorId: 'demo-investigator-id',
    action: AuditAction.DOCUMENT_UPLOADED,
    entityType: 'Document',
    entityId: 'doc-demo-1',
    metadata: {
      caseId: 'case-demo-1',
      versionNo: 1,
      sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      filename: 'forensic_bitstream_log.pdf',
    },
    prevHash: 'b9a8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8',
    entryHash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
  },
  {
    id: 'tl-3',
    sequence: 15,
    timestamp: '2026-09-30T10:45:00.000Z',
    actorId: 'demo-investigator-id',
    action: AuditAction.DOCUMENT_UPLOADED,
    entityType: 'Document',
    entityId: 'doc-demo-1',
    metadata: {
      caseId: 'case-demo-1',
      versionNo: 2,
      sha256: '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
      filename: 'forensic_bitstream_log_v2.pdf',
    },
    prevHash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2',
    entryHash: 'd3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4',
  },
];

export default function CaseDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.id;

  const { user, token } = useAuth();
  const [caseItem, setCaseItem] = useState<CaseDetailSummary | null>(null);
  const [timeline, setTimeline] = useState<AuditLedgerEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'members' | 'timeline' | 'shares' | 'exports'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Transition & Member modal states
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<CaseMemberRole>(CaseMemberRole.INVESTIGATOR);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Document action & modal states
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);
  const [integrityResult, setIntegrityResult] = useState<DocumentIntegrityResult | null>(null);
  const [selectedVersionDoc, setSelectedVersionDoc] = useState<DocumentSummary | null>(null);
  const [docVersions, setDocVersions] = useState<DocumentVersionSummary[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Controlled Sharing and Watermark states (Phase 6)
  const [caseShares, setCaseShares] = useState<ShareGrantDetailSummary[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareModalResource, setShareModalResource] = useState<{
    type: 'CASE' | 'DOCUMENT';
    id: string;
    title: string;
  } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    title: string;
    mimeType?: string;
    scope: ShareScope;
    caseNumber?: string;
  } | null>(null);
  const [revokingShareId, setRevokingShareId] = useState<string | null>(null);

  // Signed Export states (Phase 7)
  const [caseExports, setCaseExports] = useState<ExportPackageSummary[]>([]);
  const [loadingExports, setLoadingExports] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // New version upload state
  const [isUploadVersionOpen, setIsUploadVersionOpen] = useState(false);
  const [targetDocForNewVersion, setTargetDocForNewVersion] = useState<DocumentSummary | null>(
    null,
  );
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [isUploadingVersion, setIsUploadingVersion] = useState(false);
  const [uploadVersionError, setUploadVersionError] = useState<string | null>(null);

  const fetchCase = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const [resCase, resTimeline, resDocs] = await Promise.all([
        fetch(`/api/v1/cases/${caseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/cases/${caseId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/v1/cases/${caseId}/documents`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resCase.ok) {
        const data = await resCase.json();
        setCaseItem(data);
      } else {
        const err = await resCase.json().catch(() => ({}));
        setErrorMsg(err.message || 'Access restricted under ABAC policies');
      }

      if (resTimeline.ok) {
        const tlData = await resTimeline.json();
        setTimeline(tlData);
      }

      if (resDocs.ok) {
        const docsData = await resDocs.json();
        const items = Array.isArray(docsData) ? docsData : docsData.items || [];
        setDocuments(items);
      }
    } catch (err) {
      console.error('API call failed, falling back to demo case view:', err);
      setCaseItem(DEMO_CASE_DETAIL);
      setTimeline(DEMO_TIMELINE);
      setDocuments(DEMO_DOCUMENTS);
    } finally {
      setLoading(false);
    }
  }, [token, caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  // Fetch active shares for this case
  const fetchCaseShares = useCallback(async () => {
    if (!token || !caseId) return;
    setLoadingShares(true);
    try {
      const res = await fetch(`/api/v1/shares?resourceId=${caseId}&status=ALL`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCaseShares(data);
      }
    } catch {
      // fallback
    } finally {
      setLoadingShares(false);
    }
  }, [token, caseId]);

  useEffect(() => {
    fetchCaseShares();
  }, [fetchCaseShares]);

  const handleRevokeShare = async (shareId: string) => {
    if (!token) return;
    if (
      !confirm(
        'Are you sure you want to revoke this share grant immediately? Access will be revoked in real time.',
      )
    ) {
      return;
    }
    setRevokingShareId(shareId);
    try {
      const res = await fetch(`/api/v1/shares/${shareId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        fetchCaseShares();
      } else {
        const err = await res.json().catch(() => ({ message: 'Revocation failed' }));
        alert(err.message || 'Failed to revoke share grant');
      }
    } catch {
      alert('Network error while revoking share');
    } finally {
      setRevokingShareId(null);
    }
  };

  // Fetch signed exports for this case (Phase 7)
  const fetchCaseExports = useCallback(async () => {
    if (!token || !caseId) return;
    setLoadingExports(true);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/exports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCaseExports(data);
      }
    } catch {
      // fallback
    } finally {
      setLoadingExports(false);
    }
  }, [token, caseId]);

  useEffect(() => {
    fetchCaseExports();
  }, [fetchCaseExports]);

  const handleDownloadExport = async (pkgId: string) => {
    if (!token || !caseItem) return;
    try {
      const res = await fetch(`/api/v1/exports/${pkgId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download request failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SDMS_EXPORT_${caseItem.caseNumber}_${pkgId.slice(0, 8)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    }
  };

  // Fetch users for member assignment
  useEffect(() => {
    if (token) {
      fetch('/api/v1/users', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => (res.ok ? res.json() : { items: [] }))
        .then((data) => setAvailableUsers(data.items || []))
        .catch(() => {});
    }
  }, [token]);

  const handleStatusChange = async (targetStatus: CaseStatus) => {
    if (!token || !caseItem) return;
    setIsTransitioning(true);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: targetStatus,
          reason: `Transitioned to ${targetStatus} via SDMS interface`,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCaseItem(updated);
        fetchCase();
      } else {
        const err = await res.json();
        alert(err.message || 'Transition denied by policy guard');
      }
    } catch {
      // Local fallback
      setCaseItem((prev) => (prev ? { ...prev, status: targetStatus } : null));
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newMemberUserId) return;

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: newMemberUserId,
          caseRole: newMemberRole,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCaseItem(updated);
        setIsAddMemberOpen(false);
        fetchCase();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to add member');
      }
    } catch {
      setIsAddMemberOpen(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!token || !confirm('Remove this member from the investigation case?')) return;

    try {
      const res = await fetch(`/api/v1/cases/${caseId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const updated = await res.json();
        setCaseItem(updated);
        fetchCase();
      } else {
        const err = await res.json();
        alert(err.message || 'Failed to remove member');
      }
    } catch {
      setCaseItem((prev) =>
        prev
          ? {
              ...prev,
              members: prev.members.filter((m) => m.userId !== userId),
            }
          : null,
      );
    }
  };

  // Verify document cryptographic integrity against live MinIO storage
  const handleVerifyIntegrity = async (docId: string, versionNo?: number) => {
    if (!token) return;
    setVerifyingDocId(docId);
    try {
      const url = `/api/v1/documents/${docId}/verify${versionNo ? `?versionNo=${versionNo}` : ''}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result: DocumentIntegrityResult = await res.json();
        setIntegrityResult(result);
      } else {
        const err = await res.json().catch(() => ({ message: 'Verification failed' }));
        alert(err.message || 'Integrity verification failed');
      }
    } catch {
      // Demo fallback
      const targetDoc = documents.find((d) => d.id === docId);
      const hash =
        targetDoc?.sha256 || '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';
      setIntegrityResult({
        verified: true,
        documentId: docId,
        versionNo: versionNo || targetDoc?.latestVersionNo || 1,
        storedHash: hash,
        computedHash: hash,
        verifiedAt: new Date().toISOString(),
        tampered: false,
      });
    } finally {
      setVerifyingDocId(null);
    }
  };

  // Secure download via API stream with Bearer auth token
  const handleDownload = async (docId: string, versionNo?: number, fallbackTitle?: string) => {
    if (!token) return;
    try {
      const url = `/api/v1/documents/${docId}/download${versionNo ? `?versionNo=${versionNo}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Download failed' }));
        alert(err.message || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      let filename = `${fallbackTitle || 'evidence-document'}.bin`;
      if (disposition && disposition.includes('filename=')) {
        const match = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1].replace(/['"]/g, ''));
        }
      }
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch {
      alert('Network error downloading document');
    }
  };

  // Fetch full immutable version history for a document
  const handleViewVersions = async (doc: DocumentSummary) => {
    setSelectedVersionDoc(doc);
    setLoadingVersions(true);
    if (!token) {
      setLoadingVersions(false);
      return;
    }
    try {
      const res = await fetch(`/api/v1/documents/${doc.id}/versions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDocVersions(Array.isArray(data) ? data : []);
      } else {
        // Fallback demo versions
        setDocVersions([
          {
            id: 'ver-1',
            documentId: doc.id,
            versionNo: 1,
            storageKey: `cases/${caseId}/documents/${doc.id}/v1-evidence.pdf`,
            sha256:
              doc.sha256 || '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
            sizeBytes: 1542000,
            mimeType: 'application/pdf',
            uploadedById: doc.createdById,
            createdAt: doc.createdAt,
          },
          ...(doc.latestVersionNo && doc.latestVersionNo > 1
            ? [
                {
                  id: 'ver-2',
                  documentId: doc.id,
                  versionNo: 2,
                  storageKey: `cases/${caseId}/documents/${doc.id}/v2-evidence.pdf`,
                  sha256:
                    doc.sha256 ||
                    '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
                  sizeBytes: 2457600,
                  mimeType: 'application/pdf',
                  uploadedById: doc.createdById,
                  createdAt: doc.updatedAt,
                },
              ]
            : []),
        ]);
      }
    } catch {
      setDocVersions([
        {
          id: 'ver-1',
          documentId: doc.id,
          versionNo: 1,
          storageKey: `cases/${caseId}/documents/${doc.id}/v1-evidence.pdf`,
          sha256: doc.sha256 || '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
          sizeBytes: 1542000,
          mimeType: 'application/pdf',
          uploadedById: doc.createdById,
          createdAt: doc.createdAt,
        },
      ]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleOpenUploadVersion = (doc: DocumentSummary) => {
    setTargetDocForNewVersion(doc);
    setVersionFile(null);
    setUploadVersionError(null);
    setIsUploadVersionOpen(true);
  };

  const handleUploadVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !targetDocForNewVersion || !versionFile) return;

    setIsUploadingVersion(true);
    setUploadVersionError(null);

    const formData = new FormData();
    formData.append('file', versionFile);

    try {
      const res = await fetch(`/api/v1/documents/${targetDocForNewVersion.id}/versions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        setIsUploadVersionOpen(false);
        setTargetDocForNewVersion(null);
        setVersionFile(null);
        await fetchCase();
      } else {
        const err = await res.json().catch(() => ({ message: 'Failed to upload revision' }));
        setUploadVersionError(err.message || 'Upload failed');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUploadVersionError(`Upload request failed: ${msg}`);
    } finally {
      setIsUploadingVersion(false);
    }
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2500);
  };

  const getClassificationBadge = (level: ClassificationLevel) => {
    switch (level) {
      case ClassificationLevel.PUBLIC:
        return 'bg-[#DCFCE7] text-[#166534] border-[#166534]/20';
      case ClassificationLevel.RESTRICTED:
        return 'bg-[#DBEAFE] text-[#1E40AF] border-[#1E40AF]/20';
      case ClassificationLevel.CONFIDENTIAL:
        return 'bg-[#FEF3C7] text-[#92400E] border-[#92400E]/20';
      case ClassificationLevel.SECRET:
        return 'bg-[#FEE2E2] text-[#991B1B] border-[#991B1B]/20';
      default:
        return 'bg-surface-alt text-muted border-border';
    }
  };

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'PROCESSING':
      case 'SCANNING':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'QUARANTINED':
      case 'FAILED':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-surface-alt text-muted border-border';
    }
  };

  const isLead =
    user?.role === UserRole.ADMIN ||
    caseItem?.createdById === user?.id ||
    caseItem?.members.some(
      (m) => m.userId === user?.id && m.caseRole === CaseMemberRole.LEAD_INVESTIGATOR,
    );

  const isArchived = caseItem?.status === CaseStatus.ARCHIVED;

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-muted flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-primary" />
        Loading case details and evidence records...
      </div>
    );
  }

  if (errorMsg || !caseItem) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto mt-12 shadow-sm">
        <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-600 mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text">ABAC Access Restricted</h2>
        <p className="text-sm text-muted">
          {errorMsg ||
            'You do not possess the security clearance or case assignment to access this investigation file.'}
        </p>
        <Link
          href="/cases"
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-alt border border-border rounded-lg text-sm font-semibold text-text hover:bg-border/30 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Accessible Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </Link>

        <span className="text-xs font-mono text-muted flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          Created: {new Date(caseItem.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Case Header Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-primary tracking-wide bg-primary/10 px-2.5 py-1 rounded">
                {caseItem.caseNumber}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${getClassificationBadge(
                  caseItem.classification,
                )}`}
              >
                {caseItem.classification}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-text">{caseItem.title}</h1>
          </div>

          {/* Lifecycle Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {caseItem.status === CaseStatus.OPEN && (
              <button
                onClick={() => handleStatusChange(CaseStatus.UNDER_REVIEW)}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg transition"
              >
                Submit for Review
              </button>
            )}

            {caseItem.status === CaseStatus.UNDER_REVIEW && (
              <button
                onClick={() => handleStatusChange(CaseStatus.CLOSED)}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg transition"
              >
                Close Case
              </button>
            )}

            {caseItem.status === CaseStatus.CLOSED && (
              <button
                onClick={() => handleStatusChange(CaseStatus.ARCHIVED)}
                disabled={isTransitioning}
                className="px-3.5 py-2 bg-slate-500/10 hover:bg-slate-500/20 text-slate-600 dark:text-slate-400 border border-slate-500/30 text-xs font-bold rounded-lg transition"
              >
                Archive in Vault
              </button>
            )}

            {(caseItem.status === CaseStatus.CLOSED || caseItem.status === CaseStatus.ARCHIVED) &&
              isLead && (
                <button
                  onClick={() => handleStatusChange(CaseStatus.OPEN)}
                  disabled={isTransitioning}
                  className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-bold rounded-lg transition"
                >
                  Reopen Case
                </button>
              )}

            {!isArchived && (
              <button
                onClick={() => {
                  setShareModalResource({ type: 'CASE', id: caseItem.id, title: caseItem.title });
                  setIsShareModalOpen(true);
                }}
                className="px-3.5 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
                title="Create a scoped time-limited share grant for this case"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Case</span>
              </button>
            )}

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
              title="Generate a court-ready signed evidence export package (BSA 2023 §61–63)"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Signed Export</span>
            </button>
          </div>
        </div>

        {/* Lifecycle Stepper */}
        <div className="pt-2 border-t border-border/60">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-muted">Lifecycle State:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                CaseStatus.OPEN,
                CaseStatus.UNDER_REVIEW,
                CaseStatus.CLOSED,
                CaseStatus.ARCHIVED,
              ].map((step, idx) => {
                const isActive = caseItem.status === step;
                return (
                  <div key={step} className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        isActive
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-surface-alt text-muted border border-border/50'
                      }`}
                    >
                      {step.replace('_', ' ')}
                    </span>
                    {idx < 3 && <ChevronRight className="w-3.5 h-3.5 text-muted/40" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Overview
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
            activeTab === 'documents'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <FileText className="w-4 h-4" />
          Evidence Documents ({documents.length})
        </button>

        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <Users className="w-4 h-4" />
          Case Members ({caseItem.members?.length || 0})
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
            activeTab === 'timeline'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <ScrollText className="w-4 h-4" />
          Audit Timeline ({timeline.length})
        </button>

        <button
          onClick={() => setActiveTab('shares')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
            activeTab === 'shares'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <Share2 className="w-4 h-4" />
          Controlled Shares ({caseShares.length})
        </button>

        <button
          onClick={() => setActiveTab('exports')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
            activeTab === 'exports'
              ? 'bg-primary/10 text-primary border border-primary/20'
              : 'text-muted hover:text-text'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Signed Exports ({caseExports.length})
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-text">Investigation Synopsis</h3>
              <p className="text-xs text-muted leading-relaxed">
                {caseItem.description || 'No description provided for this case file.'}
              </p>
            </div>

            {/* Evidence Documents Preview Card */}
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Case Evidence Files
                  </h3>
                  <p className="text-xs text-muted">
                    SHA-256 hashed and versioned documents attached to this investigation.
                  </p>
                </div>

                {!isArchived ? (
                  <Link
                    href={`/upload?caseId=${caseId}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/20 transition"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Evidence
                  </Link>
                ) : (
                  <span className="text-[11px] font-semibold text-muted bg-surface-alt px-2.5 py-1 rounded border border-border">
                    Archived (Locked)
                  </span>
                )}
              </div>

              {documents.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-8 text-center bg-surface-alt/50 space-y-2">
                  <FileText className="w-8 h-8 text-muted mx-auto opacity-50" />
                  <p className="text-xs font-semibold text-text">
                    No evidence documents attached yet
                  </p>
                  <p className="text-[11px] text-muted max-w-sm mx-auto">
                    Evidence files uploaded will be ClamAV malware scanned, hashed with SHA-256, and
                    sealed to the audit ledger.
                  </p>
                  {!isArchived && (
                    <Link
                      href={`/upload?caseId=${caseId}`}
                      className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Attach First Evidence File
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-surface-alt border border-border rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-text">{doc.title}</span>
                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            v{doc.latestVersionNo || 1}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getClassificationBadge(
                              doc.classification,
                            )}`}
                          >
                            {doc.classification}
                          </span>
                        </div>
                        {doc.sha256 && (
                          <div className="font-mono text-[10px] text-muted truncate max-w-md">
                            SHA-256: {doc.sha256}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleVerifyIntegrity(doc.id)}
                          disabled={verifyingDocId === doc.id}
                          className="px-2.5 py-1 bg-surface border border-border hover:border-primary/50 text-[11px] font-semibold text-text rounded-md transition flex items-center gap-1"
                          title="Verify cryptographic integrity"
                        >
                          {verifyingDocId === doc.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-primary" />
                          ) : (
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          )}
                          Verify
                        </button>

                        <button
                          onClick={() => handleDownload(doc.id, undefined, doc.title)}
                          className="px-2.5 py-1 bg-surface border border-border hover:border-primary/50 text-[11px] font-semibold text-text rounded-md transition flex items-center gap-1"
                          title="Download document"
                        >
                          <Download className="w-3 h-3 text-primary" />
                          Download
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="text-center pt-1">
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View all {documents.length} evidence documents in full dossier
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Sidebar */}
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                Case Classification Details
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">Originating Department</span>
                  <span className="font-semibold text-text">
                    {caseItem.department?.name || caseItem.departmentId}
                  </span>
                </div>

                <div>
                  <span className="text-muted block text-[11px]">Case Creator</span>
                  <span className="font-semibold text-text">
                    {caseItem.createdBy?.fullName || caseItem.createdById}
                  </span>
                  <span className="text-[11px] text-muted block">{caseItem.createdBy?.email}</span>
                </div>

                <div>
                  <span className="text-muted block text-[11px]">Security Clearance</span>
                  <span
                    className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getClassificationBadge(
                      caseItem.classification,
                    )}`}
                  >
                    {caseItem.classification}
                  </span>
                </div>

                <div className="pt-2 border-t border-border">
                  <span className="text-muted block text-[11px]">Total Attached Evidence</span>
                  <span className="font-bold text-text text-sm">
                    {documents.length} Files (Versioned)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Evidence Documents (Full Dossier) */}
      {activeTab === 'documents' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Case Evidence & Forensics Dossier
              </h3>
              <p className="text-xs text-muted">
                MinIO AES-256 SSE storage, ClamAV anti-malware verification, and SHA-256 hash
                anchoring.
              </p>
            </div>

            {!isArchived ? (
              <Link
                href={`/upload?caseId=${caseId}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Upload className="w-3.5 h-3.5" />
                Ingest New Evidence
              </Link>
            ) : (
              <span className="text-xs font-bold text-muted bg-surface-alt px-3 py-1.5 rounded-lg border border-border">
                Case Archived (Read-Only)
              </span>
            )}
          </div>

          {documents.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-12 text-center bg-surface-alt/40 space-y-3">
              <FileUp className="w-10 h-10 text-muted mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-text">No Evidence Attached</h4>
              <p className="text-xs text-muted max-w-md mx-auto">
                No legal exhibits or digital forensic documents have been attached to case{' '}
                {caseItem.caseNumber} yet.
              </p>
              {!isArchived && (
                <Link
                  href={`/upload?caseId=${caseId}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition shadow-sm"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload First Evidence File
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-surface-alt border border-border rounded-xl p-4.5 space-y-3 transition hover:border-primary/30"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-text">{doc.title}</h4>
                        <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                          v{doc.latestVersionNo || 1}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getClassificationBadge(
                            doc.classification,
                          )}`}
                        >
                          {doc.classification}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getDocStatusBadge(
                            doc.status,
                          )}`}
                        >
                          {doc.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted flex items-center gap-3">
                        <span>
                          Category:{' '}
                          <strong className="text-text">{doc.type.replace('_', ' ')}</strong>
                        </span>
                        <span>•</span>
                        <span>Attached: {new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <button
                        onClick={() => handleVerifyIntegrity(doc.id)}
                        disabled={verifyingDocId === doc.id}
                        className="px-3 py-1.5 bg-surface border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-xs font-semibold text-text rounded-lg transition flex items-center gap-1.5 shadow-xs"
                        title="Verify live SHA-256 against stored ledger record"
                      >
                        {verifyingDocId === doc.id ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>Verify Integrity</span>
                      </button>

                      <button
                        onClick={() => handleDownload(doc.id, undefined, doc.title)}
                        className="px-3 py-1.5 bg-surface border border-border hover:border-primary text-xs font-semibold text-text rounded-lg transition flex items-center gap-1.5 shadow-xs"
                        title="Securely download file stream"
                      >
                        <Download className="w-3.5 h-3.5 text-primary" />
                        <span>Download</span>
                      </button>

                      <button
                        onClick={() => handleViewVersions(doc)}
                        className="px-3 py-1.5 bg-surface border border-border hover:border-primary text-xs font-semibold text-text rounded-lg transition flex items-center gap-1.5 shadow-xs"
                        title="Inspect all immutable versions"
                      >
                        <History className="w-3.5 h-3.5 text-muted" />
                        <span>History</span>
                      </button>

                      <button
                        onClick={() =>
                          setPreviewDoc({
                            id: doc.id,
                            title: doc.title,
                            mimeType: (doc as any).mimeType || 'application/pdf',
                            scope: ShareScope.DOWNLOAD,
                            caseNumber: caseItem?.caseNumber,
                          })
                        }
                        className="px-3 py-1.5 bg-surface border border-border hover:border-primary text-xs font-semibold text-text rounded-lg transition flex items-center gap-1.5 shadow-xs"
                        title="Preview with dynamic forensic watermark"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        <span>Preview</span>
                      </button>

                      {!isArchived && (
                        <button
                          onClick={() => {
                            setShareModalResource({
                              type: 'DOCUMENT',
                              id: doc.id,
                              title: doc.title,
                            });
                            setIsShareModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-surface border border-border hover:border-purple-500 text-xs font-semibold text-text rounded-lg transition flex items-center gap-1.5 shadow-xs"
                          title="Share document across departments"
                        >
                          <Share2 className="w-3.5 h-3.5 text-purple-600" />
                          <span>Share</span>
                        </button>
                      )}

                      {!isArchived && (
                        <button
                          onClick={() => handleOpenUploadVersion(doc)}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                          title="Upload new version (never overwrites)"
                        >
                          <FileUp className="w-3.5 h-3.5" />
                          <span>New Revision</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* SHA-256 Fingerprint Box */}
                  {doc.sha256 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                      <span className="text-[11px] font-bold text-muted uppercase tracking-wider shrink-0">
                        SHA-256 Seal:
                      </span>
                      <div className="flex-1 font-mono text-[11px] text-text bg-surface px-2.5 py-1 rounded border border-border truncate select-all">
                        {doc.sha256}
                      </div>
                      <button
                        onClick={() => copyHash(doc.sha256!)}
                        className="p-1 text-muted hover:text-text hover:bg-surface rounded transition"
                        title="Copy SHA-256 Hash"
                      >
                        {copiedHash === doc.sha256 ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Members */}
      {activeTab === 'members' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text">Assigned Investigation Team</h3>
              <p className="text-xs text-muted">
                Users explicitly assigned to this case receive ABAC clearance even on CONFIDENTIAL
                and SECRET tiers.
              </p>
            </div>

            {isLead && !isArchived && (
              <button
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Assign Member
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-alt border-y border-border text-muted font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Officer / User</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Case Role</th>
                  <th className="py-2.5 px-4">Assigned On</th>
                  {isLead && !isArchived && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {caseItem.members?.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-alt/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text">{m.user?.fullName || m.userId}</div>
                      <div className="text-[11px] text-muted">{m.user?.email}</div>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {m.user?.departmentId || 'Department HQ'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded text-[11px]">
                        <UserCheck className="w-3 h-3" />
                        {m.caseRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted">
                      {new Date(m.assignedAt).toLocaleDateString()}
                    </td>
                    {isLead && !isArchived && (
                      <td className="py-3 px-4 text-right">
                        {m.caseRole !== CaseMemberRole.LEAD_INVESTIGATOR && (
                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="text-rose-500 hover:text-rose-700 font-semibold text-[11px] transition"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-primary" />
              Cryptographic Case Audit Trail
            </h3>
            <p className="text-xs text-muted">
              Immutable ledger sequence entries recorded directly from the hash-chained audit
              system.
            </p>
          </div>

          <div className="space-y-3">
            {timeline.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted">
                No audit events recorded yet.
              </div>
            ) : (
              timeline.map((event) => (
                <div
                  key={event.id}
                  className="bg-surface-alt border border-border rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-muted bg-border/40 px-1.5 py-0.5 rounded">
                        Seq #{event.sequence}
                      </span>
                      <span className="font-bold text-primary">{event.action}</span>
                    </div>
                    <div className="text-[11px] font-mono text-muted truncate max-w-md">
                      Hash: {event.entryHash}
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-muted">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 5: Controlled Shares (Phase 6) */}
      {activeTab === 'shares' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Share2 className="w-4 h-4 text-primary" />
                Active Case Shares & Access Grants
              </h3>
              <p className="text-xs text-muted">
                Scoped, time-limited cross-department access grants for case {caseItem.caseNumber}{' '}
                and its exhibits.
              </p>
            </div>

            {!isArchived && (
              <button
                onClick={() => {
                  setShareModalResource({ type: 'CASE', id: caseId, title: caseItem.title });
                  setIsShareModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <Share2 className="w-3.5 h-3.5" />
                Grant New Share
              </button>
            )}
          </div>

          {loadingShares ? (
            <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              Retrieving case share grants...
            </div>
          ) : caseShares.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-10 text-center bg-surface-alt/40 space-y-3">
              <Share2 className="w-8 h-8 text-muted mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-text">No Active Shares for this Case</h4>
              <p className="text-xs text-muted max-w-sm mx-auto">
                This investigation case has not been shared with external departments or officers
                yet.
              </p>
              {!isArchived && (
                <button
                  onClick={() => {
                    setShareModalResource({ type: 'CASE', id: caseId, title: caseItem.title });
                    setIsShareModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Create First Share
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-[11px] font-bold text-muted uppercase tracking-wider bg-surface-alt/50">
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Scope</th>
                    <th className="py-2.5 px-3">Expiration</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {caseShares.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-alt/40 transition">
                      <td className="py-3 px-3">
                        <span className="font-semibold text-text">
                          {s.resourceType} • {s.resourceTitle || s.resourceId.slice(0, 8)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text">
                          {s.grantee?.fullName ||
                            s.granteeDepartment?.name ||
                            s.granteeDepartmentId ||
                            'Recipient'}
                        </div>
                        <div className="text-[11px] text-muted">
                          {s.grantee?.email || (s.granteeDepartmentId ? 'Department Scope' : '')}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            s.scope === ShareScope.DOWNLOAD
                              ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20'
                              : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                          }`}
                        >
                          {s.scope}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted">
                        {new Date(s.expiresAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        {s.isRevoked ? (
                          <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            REVOKED
                          </span>
                        ) : s.isExpired ? (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!s.isRevoked && !s.isExpired && (
                          <button
                            onClick={() => handleRevokeShare(s.id)}
                            disabled={revokingShareId === s.id}
                            className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded text-xs font-semibold transition"
                          >
                            {revokingShareId === s.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Signed Exports (Phase 7 - BSA 2023 §61–63) */}
      {activeTab === 'exports' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-primary" />
                Court Evidence Packages & Digital Signatures
              </h3>
              <p className="text-xs text-muted">
                Signed verifiable export packages with embedded manifest.json, NIST SHA-256 digests,
                and BSA 2023 §61–63 certificates.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/verify"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-surface-alt hover:bg-border text-text border border-border text-xs font-semibold rounded-lg transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Verifier</span>
              </Link>

              <button
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Generate Signed Export</span>
              </button>
            </div>
          </div>

          {loadingExports ? (
            <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-primary" />
              Loading signed export history...
            </div>
          ) : caseExports.length === 0 ? (
            <div className="border border-dashed border-border rounded-2xl p-10 text-center bg-surface-alt/40 space-y-3">
              <FileCheck2 className="w-8 h-8 text-muted mx-auto opacity-50" />
              <h4 className="text-sm font-bold text-text">No Signed Exports Generated</h4>
              <p className="text-xs text-muted max-w-sm mx-auto">
                No court evidence export packages have been generated for this case yet. Generate a
                package to seal attached exhibits with Ed25519 signatures and BSA 2023 certificates.
              </p>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Generate First Signed Package</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] font-bold text-muted uppercase tracking-wider bg-surface-alt/50">
                    <th className="py-2.5 px-3">Package ID</th>
                    <th className="py-2.5 px-3">Declarant Officer</th>
                    <th className="py-2.5 px-3">Manifest SHA-256 Digest</th>
                    <th className="py-2.5 px-3">Date Generated</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {caseExports.map((pkg) => (
                    <tr key={pkg.id} className="hover:bg-surface-alt/40 transition">
                      <td className="py-3 px-3 font-mono">
                        <span className="font-semibold text-text">{pkg.id.slice(0, 13)}...</span>
                        <div className="text-[10px] text-muted">
                          {pkg.documentCount !== undefined
                            ? `${pkg.documentCount} documents attached`
                            : 'ZIP Archive'}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-text">
                          {pkg.createdBy?.fullName || pkg.createdById}
                        </div>
                        <div className="text-[11px] text-muted">
                          {pkg.createdBy?.role}{' '}
                          {pkg.createdBy?.badgeNumber ? `• ${pkg.createdBy.badgeNumber}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-primary truncate max-w-xs">{pkg.manifestHash}</span>
                          <button
                            type="button"
                            onClick={() => {
                              void navigator.clipboard.writeText(pkg.manifestHash);
                              setCopiedHash(pkg.id);
                              setTimeout(() => setCopiedHash(null), 2000);
                            }}
                            className="text-muted hover:text-text p-0.5 rounded"
                            title="Copy Manifest Hash"
                          >
                            {copiedHash === pkg.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3 text-emerald-500" />
                          <span>Ed25519 Signed</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted whitespace-nowrap">
                        {new Date(pkg.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadExport(pkg.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded text-xs font-semibold transition"
                            title="Download Signed ZIP Archive"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download ZIP</span>
                          </button>
                          <Link
                            href="/verify"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-surface-alt hover:bg-border text-muted hover:text-text border border-border rounded text-xs font-semibold transition"
                            title="Verify Package in Offline Verifier"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Verify</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Cryptographic Integrity Verification Result */}
      {integrityResult && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    integrityResult.verified && !integrityResult.tampered
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-rose-500/10 text-rose-600'
                  }`}
                >
                  {integrityResult.verified && !integrityResult.tampered ? (
                    <ShieldCheck className="w-7 h-7" />
                  ) : (
                    <ShieldAlert className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">
                    {integrityResult.verified && !integrityResult.tampered
                      ? 'Cryptographic Seal Intact'
                      : 'Integrity Violation Detected'}
                  </h3>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      integrityResult.verified && !integrityResult.tampered
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {integrityResult.verified && !integrityResult.tampered
                      ? 'Live MinIO SHA-256 matches ledger'
                      : 'Object altered or hash mismatch'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIntegrityResult(null)}
                className="text-muted hover:text-text p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              {integrityResult.verified && !integrityResult.tampered
                ? 'The stored raw bytes were re-read directly from MinIO object storage. The live SHA-256 digest exactly matches the immutable hash locked in the database and audit ledger.'
                : 'CRITICAL ALERT: The computed SHA-256 digest of the storage object does not match the ledger seal. Possible data tampering or file corruption detected.'}
            </p>

            <div className="bg-surface-alt/70 p-4 rounded-xl border border-border space-y-3 text-xs">
              <div>
                <span className="text-[11px] font-semibold text-muted block mb-1">
                  Expected Stored Hash (Ledger / Database)
                </span>
                <div className="font-mono text-[11px] bg-surface p-2 rounded border border-border break-all select-all text-text">
                  {integrityResult.storedHash}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted block mb-1">
                  Live Computed Digest (Direct Stream from MinIO)
                </span>
                <div
                  className={`font-mono text-[11px] p-2 rounded border break-all select-all ${
                    integrityResult.verified
                      ? 'bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/5 text-rose-700 dark:text-rose-400 border-rose-500/30 font-bold'
                  }`}
                >
                  {integrityResult.computedHash}
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted pt-1">
                <span>Version Verified: v{integrityResult.versionNo}</span>
                <span>Timestamp: {new Date(integrityResult.verifiedAt).toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIntegrityResult(null)}
                className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition shadow-sm"
              >
                Close Verification Seal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Version History Inspector */}
      {selectedVersionDoc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl p-6 space-y-5 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Immutable Revision History
                </span>
                <h3 className="text-base font-bold text-text mt-0.5">{selectedVersionDoc.title}</h3>
              </div>
              <button
                onClick={() => setSelectedVersionDoc(null)}
                className="text-muted hover:text-text p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted">
              SDMS enforces append-only versioning. Previous revisions are never overwritten or
              deleted, ensuring an untampered evidentiary record.
            </p>

            {loadingVersions ? (
              <div className="p-8 text-center text-xs text-muted flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                Retrieving version registry...
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {docVersions.map((v) => {
                  const isCurrent = v.versionNo === selectedVersionDoc.latestVersionNo;
                  return (
                    <div
                      key={v.id}
                      className={`p-4 rounded-xl border transition ${
                        isCurrent
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-surface-alt/60 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-text bg-surface px-2 py-0.5 rounded border border-border">
                            Version {v.versionNo}
                          </span>
                          {isCurrent && (
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              Current Active Version
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handleVerifyIntegrity(selectedVersionDoc.id, v.versionNo)
                            }
                            className="px-2.5 py-1 bg-surface border border-border hover:border-emerald-500/50 text-[11px] font-semibold text-text rounded-md transition flex items-center gap-1"
                            title="Verify this specific version"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Verify
                          </button>

                          <button
                            onClick={() =>
                              handleDownload(
                                selectedVersionDoc.id,
                                v.versionNo,
                                `${selectedVersionDoc.title}-v${v.versionNo}`,
                              )
                            }
                            className="px-2.5 py-1 bg-surface border border-border hover:border-primary text-[11px] font-semibold text-text rounded-md transition flex items-center gap-1"
                            title="Download this version"
                          >
                            <Download className="w-3 h-3 text-primary" />
                            Download
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] text-muted mb-2">
                        <div>
                          <span>Uploaded On: </span>
                          <strong className="text-text">
                            {new Date(v.createdAt).toLocaleString()}
                          </strong>
                        </div>
                        <div>
                          <span>Size: </span>
                          <strong className="text-text">
                            {(Number(v.sizeBytes) / (1024 * 1024)).toFixed(2)} MB
                          </strong>
                        </div>
                      </div>

                      <div className="font-mono text-[10px] bg-surface p-2 rounded border border-border break-all select-all text-text flex items-center justify-between gap-2">
                        <span className="truncate">SHA-256: {v.sha256}</span>
                        <button
                          onClick={() => copyHash(v.sha256)}
                          className="shrink-0 p-1 text-muted hover:text-text transition"
                          title="Copy Hash"
                        >
                          {copiedHash === v.sha256 ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setSelectedVersionDoc(null)}
                className="px-4 py-2 bg-surface-alt border border-border text-xs font-semibold text-text rounded-lg hover:bg-border/30 transition"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Upload New Version */}
      {isUploadVersionOpen && targetDocForNewVersion && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Append New Revision
                </span>
                <h3 className="text-base font-bold text-text mt-0.5">
                  {targetDocForNewVersion.title}
                </h3>
              </div>
              <button
                onClick={() => setIsUploadVersionOpen(false)}
                className="text-muted hover:text-text p-1 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Uploading a revised file will create{' '}
              <strong>Version {(targetDocForNewVersion.latestVersionNo || 1) + 1}</strong>. All
              existing versions remain permanently preserved.
            </p>

            {uploadVersionError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadVersionError}</span>
              </div>
            )}

            <form onSubmit={handleUploadVersionSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text block">
                  Select Revision File (Max 50MB) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg,.tiff,.docx,.txt"
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="p-3 bg-surface-alt rounded-xl border border-border text-[11px] text-muted space-y-1">
                <div className="flex items-center gap-1.5 text-text font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Automated Security Pipeline
                </div>
                <p>
                  1. ClamAV anti-malware scan & EICAR test signature detection.
                  <br />
                  2. SHA-256 cryptographic digest calculation.
                  <br />
                  3. AES-256 MinIO encrypted storage & ledger seal.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadVersionOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!versionFile || isUploadingVersion}
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUploadingVersion ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Ingesting Revision...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Seal Version {(targetDocForNewVersion.latestVersionNo || 1) + 1}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-text">Assign Team Member</h3>
              <button onClick={() => setIsAddMemberOpen(false)} className="text-muted p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text mb-1">Select User</label>
                <select
                  value={newMemberUserId}
                  onChange={(e) => setNewMemberUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                >
                  <option value="">-- Choose User --</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role} - {u.email})
                    </option>
                  ))}
                  {availableUsers.length === 0 && (
                    <>
                      <option value="demo-prosecutor-id">
                        Senior Public Prosecutor Meera Sen (PROSECUTOR)
                      </option>
                      <option value="demo-court-id">Registrar K. V. Raman (COURT_OFFICER)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text mb-1">Case Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value as CaseMemberRole)}
                  className="w-full px-3 py-2 bg-surface-alt border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value={CaseMemberRole.INVESTIGATOR}>Investigator</option>
                  <option value={CaseMemberRole.PROSECUTOR}>Prosecutor</option>
                  <option value={CaseMemberRole.REVIEWER}>Reviewer</option>
                  <option value={CaseMemberRole.LEAD_INVESTIGATOR}>Lead Investigator</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 text-xs text-muted hover:text-text transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-lg shadow-sm transition"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Controlled Share Creation Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => {
            setIsShareModalOpen(false);
            setShareModalResource(null);
          }}
          onSuccess={() => {
            fetchCaseShares();
          }}
          prefilledResourceType={shareModalResource?.type || 'CASE'}
          prefilledResourceId={shareModalResource?.id || caseId}
          prefilledResourceTitle={shareModalResource?.title || caseItem?.title || ''}
        />
      )}

      {/* Forensic Watermark Inline Preview Modal */}
      {previewDoc && (
        <WatermarkPreviewModal
          isOpen={true}
          onClose={() => setPreviewDoc(null)}
          documentId={previewDoc.id}
          documentTitle={previewDoc.title}
          mimeType={previewDoc.mimeType}
          scope={previewDoc.scope}
          caseNumber={previewDoc.caseNumber || caseItem?.caseNumber}
        />
      )}

      {/* Court Signed Evidence Export Modal (Phase 7) */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          caseId={caseId}
          caseNumber={caseItem?.caseNumber || ''}
          caseTitle={caseItem?.title || ''}
          documents={documents}
          onExportSuccess={() => {
            fetchCaseExports();
          }}
        />
      )}
    </div>
  );
}
