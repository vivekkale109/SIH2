import {
  UserRole,
  DepartmentType,
  CaseStatus,
  ClassificationLevel,
  CaseMemberRole,
  ShareScope,
  DocumentStatus,
} from './enums.js';

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  badgeNumber?: string;
  role: UserRole;
  departmentId: string;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
  code: string;
  type: DepartmentType;
  jurisdiction?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CaseSummary {
  id: string;
  caseNumber: string;
  title: string;
  description?: string;
  status: CaseStatus;
  classification: ClassificationLevel;
  departmentId: string;
  createdById: string;
  documentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseMemberSummary {
  id: string;
  caseId: string;
  userId: string;
  caseRole: CaseMemberRole;
  assignedAt: string;
  user?: UserSummary;
}

export interface CaseDetailSummary extends CaseSummary {
  department?: DepartmentSummary;
  createdBy?: UserSummary;
  members: CaseMemberSummary[];
}

export interface DocumentSummary {
  id: string;
  caseId: string;
  title: string;
  type: string;
  classification: ClassificationLevel;
  status: DocumentStatus;
  currentVersionId?: string;
  latestVersionNo?: number;
  sha256?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersionSummary {
  id: string;
  documentId: string;
  versionNo: number;
  storageKey: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  uploadedById: string;
  createdAt: string;
  uploadedBy?: UserSummary;
}

export interface DocumentDetailSummary extends DocumentSummary {
  case?: CaseSummary;
  createdBy?: UserSummary;
  currentVersion?: DocumentVersionSummary;
  versions: DocumentVersionSummary[];
}

export interface DocumentIntegrityResult {
  verified: boolean;
  documentId: string;
  versionNo: number;
  storedHash: string;
  computedHash: string;
  verifiedAt: string;
  tampered: boolean;
}

export interface ShareGrantSummary {
  id: string;
  resourceType: 'CASE' | 'DOCUMENT';
  resourceId: string;
  granterId: string;
  granteeId?: string;
  granteeDepartmentId?: string;
  scope: ShareScope;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
}
