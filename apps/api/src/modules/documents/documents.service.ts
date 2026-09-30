import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, CaseStatus, DocumentStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import {
  DocumentSummary,
  DocumentDetailSummary,
  DocumentVersionSummary,
  DocumentIntegrityResult,
  AuditAction,
  ClassificationLevel as SharedClassificationLevel,
  CaseStatus as SharedCaseStatus,
  DocumentStatus as SharedDocumentStatus,
  UserRole,
} from '@sdms/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { ClamavService } from '../storage/clamav.service';
import { PolicyService } from '../cases/policy/policy.service';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateDocumentDto } from './dto/create-document.dto';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
]);

type DocumentWithRelations = Prisma.DocumentGetPayload<{
  include: {
    case: true;
    createdBy: true;
    versions: {
      include: {
        uploadedBy: true;
      };
      orderBy: { versionNo: 'asc' };
    };
  };
}>;

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly clamavService: ClamavService,
    private readonly policyService: PolicyService,
  ) {}

  /**
   * Uploads an initial evidence document to a case.
   * Performs ClamAV malware scanning, SHA-256 hashing, MinIO encrypted ingestion,
   * version 1 creation, and tamper-evident audit ledger recording.
   */
  async upload(
    caseId: string,
    file: Express.Multer.File,
    dto: CreateDocumentDto,
    user: AuthenticatedUser,
  ): Promise<DocumentDetailSummary> {
    const caseItem = await this.prisma.case.findUnique({
      where: { id: caseId },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case with ID '${caseId}' not found`);
    }

    // 1. ABAC Authorization check
    const hasAccess = await this.policyService.canAccessCase(user, caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not cleared to attach documents to case '${caseId}'`,
      );
    }

    if (caseItem.status === CaseStatus.ARCHIVED) {
      throw new BadRequestException(
        'Archived cases are immutable. Uploading documents is prohibited.',
      );
    }

    // 2. Validate file presence, size, and MIME type
    this.validateFile(file);

    // 3. Malware Scan via ClamAV (detects viruses and standardized EICAR test signature)
    const scan = await this.clamavService.scanBuffer(file.buffer);
    if (scan.isInfected) {
      void this.auditService
        .record({
          actorId: user.id,
          action: AuditAction.DOCUMENT_UPLOADED,
          entityType: 'Case',
          entityId: caseId,
          metadata: {
            filename: file.originalname,
            malwareDetected: true,
            virusName: scan.virusName,
            status: DocumentStatus.QUARANTINED,
          },
        })
        .catch((err) => this.logger.error('Failed to log quarantined malware audit event', err));

      throw new BadRequestException(
        `Malware Detected: Uploaded file contains virus signature '${scan.virusName}'. The file has been quarantined and rejected.`,
      );
    }

    // 4. Compute SHA-256 Digest
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // 5. Ingest into MinIO object storage with AES-256 SSE
    const documentId = crypto.randomUUID();
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `cases/${caseId}/documents/${documentId}/v1-${sanitizedFilename}`;

    await this.storageService.upload(storageKey, file.buffer, file.mimetype, {
      caseId,
      documentId,
      versionNo: '1',
      originalName: file.originalname,
    });

    // 6. Database record creation within transaction
    const classification = dto.classification || caseItem.classification;

    const createdDocument = await this.prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          id: documentId,
          caseId,
          title: dto.title,
          type: dto.type,
          classification,
          status: DocumentStatus.READY,
          createdById: user.id,
        },
      });

      const version = await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNo: 1,
          storageKey,
          sha256,
          sizeBytes: BigInt(file.size),
          mimeType: file.mimetype,
          uploadedById: user.id,
        },
      });

      await tx.document.update({
        where: { id: doc.id },
        data: { currentVersionId: version.id },
      });

      return doc;
    });

    // 7. Audit Ledger Recording (chained immutable events)
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        entityType: 'Document',
        entityId: createdDocument.id,
        metadata: {
          caseId,
          documentId: createdDocument.id,
          versionNo: 1,
          sha256,
          filename: file.originalname,
          sizeBytes: file.size,
          mimeType: file.mimetype,
          classification,
        },
      })
      .catch((err) => this.logger.error('Failed to log document upload audit entry', err));

    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.DOCUMENT_INGESTED,
        entityType: 'Document',
        entityId: createdDocument.id,
        metadata: {
          caseId,
          sha256,
          status: DocumentStatus.READY,
        },
      })
      .catch((err) => this.logger.error('Failed to log document ingestion audit entry', err));

    this.logger.log(
      `Ingested document '${createdDocument.title}' (v1) into case ${caseId} by ${user.email}`,
    );
    return this.getDocumentById(createdDocument.id, user);
  }

  /**
   * Ingests a new revision/version for an existing document without ever overwriting previous versions.
   */
  async uploadNewVersion(
    documentId: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ): Promise<DocumentDetailSummary> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: true,
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID '${documentId}' not found`);
    }

    if (doc.case.status === CaseStatus.ARCHIVED) {
      throw new BadRequestException(
        'Archived cases are immutable. Uploading new versions is prohibited.',
      );
    }

    // ABAC Check
    const hasAccess = await this.policyService.canAccessCase(user, doc.caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not authorized to revise document '${documentId}'`,
      );
    }

    // Validate file
    this.validateFile(file);

    // Malware scan
    const scan = await this.clamavService.scanBuffer(file.buffer);
    if (scan.isInfected) {
      void this.auditService
        .record({
          actorId: user.id,
          action: AuditAction.DOCUMENT_UPLOADED,
          entityType: 'Document',
          entityId: documentId,
          metadata: {
            filename: file.originalname,
            malwareDetected: true,
            virusName: scan.virusName,
            status: DocumentStatus.QUARANTINED,
          },
        })
        .catch((err) => this.logger.error('Failed to log quarantined malware audit event', err));

      throw new BadRequestException(
        `Malware Detected: Uploaded revision contains virus signature '${scan.virusName}'. Rejected.`,
      );
    }

    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    const lastVersionNo = doc.versions[0]?.versionNo ?? 0;
    const nextVersionNo = lastVersionNo + 1;

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `cases/${doc.caseId}/documents/${documentId}/v${nextVersionNo}-${sanitizedFilename}`;

    // Upload to MinIO
    await this.storageService.upload(storageKey, file.buffer, file.mimetype, {
      caseId: doc.caseId,
      documentId,
      versionNo: String(nextVersionNo),
      originalName: file.originalname,
    });

    // Append new version in DB and point currentVersionId to it
    await this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.documentVersion.create({
        data: {
          documentId,
          versionNo: nextVersionNo,
          storageKey,
          sha256,
          sizeBytes: BigInt(file.size),
          mimeType: file.mimetype,
          uploadedById: user.id,
        },
      });

      await tx.document.update({
        where: { id: documentId },
        data: { currentVersionId: newVersion.id },
      });
    });

    // Record in audit ledger
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.DOCUMENT_UPLOADED,
        entityType: 'Document',
        entityId: documentId,
        metadata: {
          caseId: doc.caseId,
          documentId,
          versionNo: nextVersionNo,
          sha256,
          filename: file.originalname,
          sizeBytes: file.size,
          mimeType: file.mimetype,
        },
      })
      .catch((err) => this.logger.error('Failed to log document version upload audit record', err));

    this.logger.log(
      `Created version ${nextVersionNo} for document '${doc.title}' by ${user.email}`,
    );
    return this.getDocumentById(documentId, user);
  }

  /**
   * Retrieves all documents attached to a case, subject to ABAC clearance.
   */
  async getDocumentsForCase(caseId: string, user: AuthenticatedUser): Promise<DocumentSummary[]> {
    const hasAccess = await this.policyService.canAccessCase(user, caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not authorized to view documents for case '${caseId}'`,
      );
    }

    const docs = await this.prisma.document.findMany({
      where: { caseId },
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => {
      const latestVer = d.versions[0];
      return {
        id: d.id,
        caseId: d.caseId,
        title: d.title,
        type: d.type,
        classification: d.classification as unknown as SharedClassificationLevel,
        status: d.status as unknown as SharedDocumentStatus,
        currentVersionId: d.currentVersionId || undefined,
        latestVersionNo: latestVer?.versionNo,
        sha256: latestVer?.sha256,
        createdById: d.createdById,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves single document detail including full immutable version history.
   * Records DOCUMENT_VIEWED audit ledger entry.
   */
  async getDocumentById(
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<DocumentDetailSummary> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: true,
        createdBy: true,
        versions: {
          include: { uploadedBy: true },
          orderBy: { versionNo: 'asc' },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID '${documentId}' not found`);
    }

    const hasAccess = await this.policyService.canAccessCase(user, doc.caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not authorized to inspect document '${documentId}'`,
      );
    }

    // Record audit event for document inspection
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.DOCUMENT_VIEWED,
        entityType: 'Document',
        entityId: documentId,
        metadata: {
          caseId: doc.caseId,
          title: doc.title,
          classification: doc.classification,
        },
      })
      .catch((err) => this.logger.error('Failed to log document view audit record', err));

    return this.mapToDetailSummary(doc);
  }

  /**
   * Retrieves all immutable versions of a document.
   */
  async getVersions(
    documentId: string,
    user: AuthenticatedUser,
  ): Promise<DocumentVersionSummary[]> {
    const doc = await this.getDocumentById(documentId, user);
    return doc.versions;
  }

  /**
   * Re-streams stored object bytes from MinIO, recomputes SHA-256 digest in real-time,
   * compares with the database and ledger recorded hash, and writes verification audit event.
   */
  async verifyIntegrity(
    documentId: string,
    versionNo?: number,
    user?: AuthenticatedUser,
  ): Promise<DocumentIntegrityResult> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: true,
        versions: {
          orderBy: { versionNo: 'desc' },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID '${documentId}' not found`);
    }

    if (user) {
      const hasAccess = await this.policyService.canAccessCase(user, doc.caseId);
      if (!hasAccess) {
        throw new ForbiddenException(
          `ABAC Denied: User '${user.email}' is not authorized to verify document '${documentId}'`,
        );
      }
    }

    const targetVersion = versionNo
      ? doc.versions.find((v) => v.versionNo === versionNo)
      : doc.versions[0];

    if (!targetVersion) {
      throw new NotFoundException(
        `Version ${versionNo || 'latest'} not found for document '${documentId}'`,
      );
    }

    // Recompute live SHA-256 hash from MinIO storage
    let computedHash: string;
    try {
      computedHash = await this.storageService.computeSha256(targetVersion.storageKey);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Storage read error during integrity verification for key ${targetVersion.storageKey}: ${msg}`,
      );
      computedHash = 'STORAGE_OBJECT_UNREADABLE';
    }

    const verified = computedHash === targetVersion.sha256;
    const verifiedAt = new Date().toISOString();

    if (user) {
      void this.auditService
        .record({
          actorId: user.id,
          action: verified
            ? AuditAction.DOCUMENT_INTEGRITY_VERIFIED
            : AuditAction.DOCUMENT_INTEGRITY_FAILED,
          entityType: 'Document',
          entityId: documentId,
          metadata: {
            caseId: doc.caseId,
            versionNo: targetVersion.versionNo,
            storedHash: targetVersion.sha256,
            computedHash,
            verified,
          },
        })
        .catch((err) => this.logger.error('Failed to log document integrity audit event', err));
    }

    return {
      verified,
      documentId,
      versionNo: targetVersion.versionNo,
      storedHash: targetVersion.sha256,
      computedHash,
      verifiedAt,
      tampered: !verified,
    };
  }

  /**
   * Secure download of document version with audit logging and stream output.
   */
  async download(
    documentId: string,
    versionNo: number | undefined,
    user: AuthenticatedUser,
  ): Promise<{ stream: Readable; mimeType: string; filename: string; sizeBytes: number }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: true,
        versions: {
          orderBy: { versionNo: 'desc' },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID '${documentId}' not found`);
    }

    const hasAccess = await this.policyService.canAccessCase(user, doc.caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' cannot download document '${documentId}'`,
      );
    }

    const targetVersion = versionNo
      ? doc.versions.find((v) => v.versionNo === versionNo)
      : doc.versions[0];

    if (!targetVersion) {
      throw new NotFoundException(
        `Version ${versionNo || 'latest'} not found for document '${documentId}'`,
      );
    }

    const stream = await this.storageService.getStream(targetVersion.storageKey);
    const filename = targetVersion.storageKey.split('/').pop() || `${doc.title}.bin`;

    // Record download audit event
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.DOCUMENT_DOWNLOADED,
        entityType: 'Document',
        entityId: documentId,
        metadata: {
          caseId: doc.caseId,
          versionNo: targetVersion.versionNo,
          sha256: targetVersion.sha256,
          filename,
        },
      })
      .catch((err) => this.logger.error('Failed to log document download audit event', err));

    return {
      stream,
      mimeType: targetVersion.mimeType,
      filename,
      sizeBytes: Number(targetVersion.sizeBytes),
    };
  }

  private validateFile(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required for document upload');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `File size (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds allowed limit of 50 MB`,
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `File MIME type '${file.mimetype}' is not supported. Allowed formats: PDF, JPG, PNG, TIFF, DOCX, TXT.`,
      );
    }
  }

  private mapToDetailSummary(doc: DocumentWithRelations): DocumentDetailSummary {
    const versions: DocumentVersionSummary[] = doc.versions.map((v) => ({
      id: v.id,
      documentId: v.documentId,
      versionNo: v.versionNo,
      storageKey: v.storageKey,
      sha256: v.sha256,
      sizeBytes: Number(v.sizeBytes),
      mimeType: v.mimeType,
      uploadedById: v.uploadedById,
      createdAt: v.createdAt.toISOString(),
      uploadedBy: v.uploadedBy
        ? {
            id: v.uploadedBy.id,
            email: v.uploadedBy.email,
            fullName: v.uploadedBy.fullName,
            badgeNumber: v.uploadedBy.badgeNumber || undefined,
            role: v.uploadedBy.role as unknown as UserRole,
            departmentId: v.uploadedBy.departmentId,
            isActive: v.uploadedBy.isActive,
            mfaEnabled: v.uploadedBy.mfaEnabled,
            createdAt: v.uploadedBy.createdAt.toISOString(),
            updatedAt: v.uploadedBy.updatedAt.toISOString(),
          }
        : undefined,
    }));

    const currentVersion =
      versions.find((v) => v.id === doc.currentVersionId) || versions[versions.length - 1];

    return {
      id: doc.id,
      caseId: doc.caseId,
      title: doc.title,
      type: doc.type,
      classification: doc.classification as unknown as SharedClassificationLevel,
      status: doc.status as unknown as SharedDocumentStatus,
      currentVersionId: doc.currentVersionId || undefined,
      latestVersionNo: currentVersion?.versionNo,
      sha256: currentVersion?.sha256,
      createdById: doc.createdById,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      currentVersion,
      versions,
      case: doc.case
        ? {
            id: doc.case.id,
            caseNumber: doc.case.caseNumber,
            title: doc.case.title,
            description: doc.case.description || undefined,
            status: doc.case.status as unknown as SharedCaseStatus,
            classification: doc.case.classification as unknown as SharedClassificationLevel,
            departmentId: doc.case.departmentId,
            createdById: doc.case.createdById,
            createdAt: doc.case.createdAt?.toISOString() ?? new Date().toISOString(),
            updatedAt: doc.case.updatedAt?.toISOString() ?? new Date().toISOString(),
          }
        : undefined,
      createdBy: doc.createdBy
        ? {
            id: doc.createdBy.id,
            email: doc.createdBy.email,
            fullName: doc.createdBy.fullName,
            badgeNumber: doc.createdBy.badgeNumber || undefined,
            role: doc.createdBy.role as unknown as UserRole,
            departmentId: doc.createdBy.departmentId,
            isActive: doc.createdBy.isActive,
            mfaEnabled: doc.createdBy.mfaEnabled,
            createdAt: doc.createdBy.createdAt.toISOString(),
            updatedAt: doc.createdBy.updatedAt.toISOString(),
          }
        : undefined,
    };
  }
}
