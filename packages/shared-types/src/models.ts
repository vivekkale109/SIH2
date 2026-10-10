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
  processingError?: string | null;
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
  ocrResult?: OcrResultSummary;
}

export interface OcrResultSummary {
  id: string;
  versionId: string;
  extractedText: string;
  confidence: number | null;
  extractedMetadata?: {
    detectedType?: string;
    dates?: string[];
    caseNumbers?: string[];
    entities?: Array<{ role: string; name: string }>;
    sections?: string[];
    [key: string]: unknown;
  } | null;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetailSummary extends DocumentSummary {
  case?: CaseSummary;
  createdBy?: UserSummary;
  currentVersion?: DocumentVersionSummary;
  versions: DocumentVersionSummary[];
  ocrResult?: OcrResultSummary;
}

export interface SearchResultItem {
  documentId: string;
  caseId: string;
  caseNumber: string;
  caseTitle: string;
  title: string;
  type: string;
  classification: ClassificationLevel;
  status: DocumentStatus;
  versionNo: number;
  sha256?: string;
  sizeBytes?: number;
  createdAt: string;
  snippet?: string;
  matchScore?: number;
  extractedMetadata?: Record<string, unknown> | null;
  ocrConfidence?: number | null;
}

export interface SearchResultsResponse {
  results: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
}

export interface UpdateOcrVerificationDto {
  extractedText?: string;
  type?: string;
  classification?: ClassificationLevel;
  extractedMetadata?: Record<string, unknown>;
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

export interface CreateShareGrantDto {
  resourceType: 'CASE' | 'DOCUMENT';
  resourceId: string;
  granteeId?: string;
  granteeDepartmentId?: string;
  scope: ShareScope;
  expiresAt: string;
  passwordConfirm?: string;
}

export interface ShareGrantDetailSummary extends ShareGrantSummary {
  granter?: UserSummary;
  grantee?: UserSummary;
  granteeDepartment?: DepartmentSummary;
  resourceTitle?: string;
  resourceCaseNumber?: string;
  isExpired: boolean;
  isRevoked: boolean;
}

export interface ExportManifestDocument {
  id: string;
  title: string;
  type: string;
  classification: ClassificationLevel;
  versionNo: number;
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
}

export interface ExportManifestAuditEntry {
  sequence: number;
  timestamp: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  prevHash: string;
  entryHash: string;
}

export interface EvidenceCertificate {
  statutoryBasis: string;
  certificationDate: string;
  declarantName: string;
  declarantDesignation: string;
  declarantDepartment: string;
  declarantBadge?: string;
  caseNumber: string;
  systemName: string;
  hashAlgorithm: string;
  statement: string;
}

export interface ExportManifest {
  manifestVersion: string;
  packageId: string;
  case: {
    id: string;
    caseNumber: string;
    title: string;
    classification: ClassificationLevel;
    departmentId: string;
  };
  exportedAt: string;
  exportedBy: {
    id: string;
    fullName: string;
    email: string;
    badgeNumber?: string;
    role: UserRole;
    departmentId: string;
  };
  evidenceCertificate: EvidenceCertificate;
  documents: ExportManifestDocument[];
  auditTrail: ExportManifestAuditEntry[];
  manifestHash: string;
  signature: string;
  publicKey: string;
}

export interface ExportPackageSummary {
  id: string;
  caseId: string;
  manifestHash: string;
  signature: string;
  createdById: string;
  createdAt: string;
  createdBy?: UserSummary;
  case?: CaseSummary;
  documentCount?: number;
  fileSizeBytes?: number;
  downloadUrl?: string;
}

export interface CreateExportDto {
  documentIds?: string[];
  passwordConfirm?: string;
  notes?: string;
}

export interface PackageVerificationDocumentCheck {
  title: string;
  relativePath: string;
  expectedHash: string;
  computedHash: string;
  match: boolean;
}

export interface PackageVerificationResult {
  verified: boolean;
  status:
    'VALID' | 'TAMPERED_MANIFEST' | 'TAMPERED_DOCUMENT' | 'INVALID_SIGNATURE' | 'CORRUPTED_PACKAGE';
  packageId?: string;
  caseNumber?: string;
  caseTitle?: string;
  exportedAt?: string;
  exportedBy?: string;
  signerPublicKey?: string;
  signatureValid: boolean;
  manifestHashValid: boolean;
  documentsChecked: PackageVerificationDocumentCheck[];
  auditChainValid: boolean;
  certificateText?: string;
  errors: string[];
  warnings: string[];
}
