import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import { Readable } from 'stream';
import JSZip from 'jszip';
import {
  ExportPackageSummary,
  ExportManifest,
  ExportManifestDocument,
  ExportManifestAuditEntry,
  PackageVerificationResult,
  AuditAction,
  ClassificationLevel,
  UserRole,
} from '@sdms/shared-types';
import { verifyExportPackage } from '@sdms/verifier';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../storage/storage.service';
import { PolicyService } from '../cases/policy/policy.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { SignerService } from './services/signer.service';
import { CertificateService } from './services/certificate.service';
import { CreateExportDto } from './dto/create-export.dto';

const REAUTH_WINDOW_SECONDS = 900; // 15 minutes

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: StorageService,
    private readonly policyService: PolicyService,
    private readonly signerService: SignerService,
    private readonly certificateService: CertificateService,
  ) {}

  /**
   * Generates a court-ready, Ed25519 digitally signed evidence export package
   * with manifest.json, raw document bytes, and BSA 2023 §61–63 electronic evidence certificate.
   */
  async createExport(
    caseId: string,
    dto: CreateExportDto,
    user: AuthenticatedUser,
  ): Promise<ExportPackageSummary> {
    // 1. Re-authentication check
    await this.verifyReAuthentication(user, dto.passwordConfirm);

    // 2. ABAC clearance check
    const canExport = await this.policyService.canExportCase(user, caseId);
    if (!canExport) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not cleared to export case '${caseId}'`,
      );
    }

    // 3. Fetch User metadata for official declarant signature
    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.id },
    });
    const fullName = userRecord?.fullName || user.email;
    const badgeNumber = userRecord?.badgeNumber ?? user.badgeNumber;

    // 4. Fetch Case metadata
    const caseItem = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: {
        department: true,
        createdBy: true,
      },
    });

    if (!caseItem) {
      throw new NotFoundException(`Case '${caseId}' not found`);
    }

    // 5. Fetch attached documents and their latest versions
    const docQuery: Prisma.DocumentWhereInput = { caseId };
    if (dto.documentIds && dto.documentIds.length > 0) {
      docQuery.id = { in: dto.documentIds };
    }

    const documents = await this.prisma.document.findMany({
      where: docQuery,
      include: {
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
        },
      },
    });

    if (documents.length === 0) {
      throw new BadRequestException('Cannot generate an export package with 0 evidence documents');
    }

    // 5. Gather file bytes from MinIO and compile manifest document entries
    const manifestDocuments: ExportManifestDocument[] = [];
    const documentFiles: Array<{ filename: string; relativePath: string; buffer: Buffer }> = [];

    for (const doc of documents) {
      const latestVersion = doc.versions[0];
      if (!latestVersion) {
        throw new BadRequestException(`Document '${doc.id}' (${doc.title}) has no stored version`);
      }

      // Download file bytes directly from MinIO
      const fileBuffer = await this.storageService.getBuffer(latestVersion.storageKey);

      // Verify SHA-256 against stored database hash
      const computedSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
      if (computedSha256 !== latestVersion.sha256) {
        throw new BadRequestException(
          `Integrity validation failed for '${doc.title}': Storage hash differs from recorded version hash`,
        );
      }

      // Sanitize filename for ZIP filesystem
      const sanitizedName = `${doc.title.replace(/[^a-zA-Z0-9._-]/g, '_')}_v${latestVersion.versionNo}.${this.getExtensionForMime(latestVersion.mimeType)}`;
      const relativePath = `documents/${sanitizedName}`;

      manifestDocuments.push({
        id: doc.id,
        title: doc.title,
        type: doc.type,
        classification: doc.classification as unknown as ClassificationLevel,
        versionNo: latestVersion.versionNo,
        relativePath,
        sha256: latestVersion.sha256,
        sizeBytes: Number(latestVersion.sizeBytes),
        mimeType: latestVersion.mimeType,
      });

      documentFiles.push({
        filename: sanitizedName,
        relativePath,
        buffer: fileBuffer,
      });
    }

    // 6. Gather chronological audit ledger trail for this case and documents
    const docIds = documents.map((d) => d.id);
    const auditEntries = await this.prisma.auditLedger.findMany({
      where: {
        OR: [
          { entityId: caseId },
          { entityId: { in: docIds } },
          { metadata: { path: ['caseId'], equals: caseId } },
        ],
      },
      orderBy: { sequence: 'asc' },
      take: 100,
    });

    const auditTrailExtract: ExportManifestAuditEntry[] = auditEntries.map((a) => ({
      sequence: Number(a.sequence),
      timestamp: a.timestamp.toISOString(),
      actorId: a.actorId,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      prevHash: a.prevHash,
      entryHash: a.entryHash,
    }));

    const packageId = crypto.randomUUID();

    // 7. Generate BSA 2023 §61–63 certificate
    // First generate preliminary manifest hash for certificate
    const prelimManifestPayload = {
      manifestVersion: '1.0.0',
      packageId,
      case: {
        id: caseItem.id,
        caseNumber: caseItem.caseNumber,
        title: caseItem.title,
        classification: caseItem.classification as unknown as ClassificationLevel,
        departmentId: caseItem.departmentId,
      },
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: user.id,
        fullName,
        email: user.email,
        badgeNumber,
        role: user.role,
        departmentId: user.departmentId,
      },
      documents: manifestDocuments,
      auditTrail: auditTrailExtract,
    };

    const prelimCanonical = this.canonicalJson(prelimManifestPayload);
    const prelimHash = crypto.createHash('sha256').update(prelimCanonical).digest('hex');

    const evidenceCertificate = this.certificateService.generateCertificate(
      {
        fullName,
        role: user.role,
        departmentId: user.departmentId,
        badgeNumber,
        email: user.email,
      },
      {
        caseNumber: caseItem.caseNumber,
        caseTitle: caseItem.title,
        documentCount: manifestDocuments.length,
        packageId,
        manifestHash: prelimHash,
        notes: dto.notes,
      },
    );

    // 8. Build final manifest payload to be hashed and signed
    const finalManifestPayload = {
      ...prelimManifestPayload,
      evidenceCertificate,
    };

    const canonicalManifestJson = this.canonicalJson(finalManifestPayload);
    const manifestHash = crypto.createHash('sha256').update(canonicalManifestJson).digest('hex');

    // 9. Sign manifest with Ed25519 private key
    const signResult = this.signerService.signData(manifestHash);

    const fullManifest: ExportManifest = {
      ...finalManifestPayload,
      manifestHash,
      signature: signResult.signature,
      publicKey: signResult.publicKey,
    };

    // 10. Construct ZIP archive
    const zip = new JSZip();

    // (a) Root manifest.json
    zip.file('manifest.json', JSON.stringify(fullManifest, null, 2));

    // (b) Human-readable evidence certificate
    zip.file('certificate_BSA_2023.txt', evidenceCertificate.statement);

    // (c) Detached cryptographic signature & public key
    zip.file('signature.sig', signResult.signature);
    zip.file('pubkey.pem', signResult.publicKey);

    // (d) Embedded document files in documents/ folder
    for (const docFile of documentFiles) {
      zip.file(docFile.relativePath, docFile.buffer);
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    // 11. Upload ZIP to MinIO storage
    const storageKey = `exports/${packageId}.zip`;
    await this.storageService.upload(storageKey, zipBuffer, 'application/zip', {
      caseId,
      caseNumber: caseItem.caseNumber,
      packageId,
      manifestHash,
    });

    // 12. Save record in database
    const exportRecord = await this.prisma.exportPackage.create({
      data: {
        id: packageId,
        caseId,
        manifestHash,
        signature: signResult.signature,
        createdById: user.id,
      },
      include: {
        createdBy: true,
        case: true,
      },
    });

    // 13. Append EXPORT_CREATED to immutable audit ledger
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.EXPORT_CREATED,
        entityType: 'ExportPackage',
        entityId: exportRecord.id,
        metadata: {
          caseId,
          caseNumber: caseItem.caseNumber,
          manifestHash,
          documentCount: manifestDocuments.length,
          fileSizeBytes: zipBuffer.length,
          ed25519Signature: signResult.signature.slice(0, 32) + '...',
        },
      })
      .catch((err) => this.logger.error('Failed to log EXPORT_CREATED ledger entry', err));

    this.logger.log(
      `Export package ${packageId} created for case ${caseItem.caseNumber} by ${user.email} (${manifestDocuments.length} files, ${zipBuffer.length} bytes)`,
    );

    return {
      id: exportRecord.id,
      caseId: exportRecord.caseId,
      manifestHash: exportRecord.manifestHash,
      signature: exportRecord.signature,
      createdById: exportRecord.createdById,
      createdAt: exportRecord.createdAt.toISOString(),
      documentCount: manifestDocuments.length,
      fileSizeBytes: zipBuffer.length,
      createdBy: {
        id: exportRecord.createdBy.id,
        fullName: exportRecord.createdBy.fullName,
        email: exportRecord.createdBy.email,
        badgeNumber: exportRecord.createdBy.badgeNumber ?? undefined,
        role: exportRecord.createdBy.role as unknown as UserRole,
        departmentId: exportRecord.createdBy.departmentId,
        isActive: exportRecord.createdBy.isActive,
        mfaEnabled: exportRecord.createdBy.mfaEnabled,
        createdAt: exportRecord.createdBy.createdAt.toISOString(),
        updatedAt: exportRecord.createdBy.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Lists export packages created for a specific investigation case.
   */
  async getExportsForCase(
    caseId: string,
    user: AuthenticatedUser,
  ): Promise<ExportPackageSummary[]> {
    const hasAccess = await this.policyService.canAccessCase(user, caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not cleared to inspect exports for case '${caseId}'`,
      );
    }

    const exports = await this.prisma.exportPackage.findMany({
      where: { caseId },
      include: {
        createdBy: true,
        case: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return exports.map((e) => ({
      id: e.id,
      caseId: e.caseId,
      manifestHash: e.manifestHash,
      signature: e.signature,
      createdById: e.createdById,
      createdAt: e.createdAt.toISOString(),
      createdBy: {
        id: e.createdBy.id,
        fullName: e.createdBy.fullName,
        email: e.createdBy.email,
        badgeNumber: e.createdBy.badgeNumber ?? undefined,
        role: e.createdBy.role as unknown as UserRole,
        departmentId: e.createdBy.departmentId,
        isActive: e.createdBy.isActive,
        mfaEnabled: e.createdBy.mfaEnabled,
        createdAt: e.createdBy.createdAt.toISOString(),
        updatedAt: e.createdBy.updatedAt.toISOString(),
      },
    }));
  }

  /**
   * Retrieves export package details by ID.
   */
  async getExportById(id: string, user: AuthenticatedUser): Promise<ExportPackageSummary> {
    const pkg = await this.prisma.exportPackage.findUnique({
      where: { id },
      include: {
        createdBy: true,
        case: true,
      },
    });

    if (!pkg) {
      throw new NotFoundException(`Export package '${id}' not found`);
    }

    const hasAccess = await this.policyService.canAccessCase(user, pkg.caseId);
    if (!hasAccess) {
      throw new ForbiddenException(`ABAC Denied: Cannot view export package '${id}'`);
    }

    return {
      id: pkg.id,
      caseId: pkg.caseId,
      manifestHash: pkg.manifestHash,
      signature: pkg.signature,
      createdById: pkg.createdById,
      createdAt: pkg.createdAt.toISOString(),
      createdBy: {
        id: pkg.createdBy.id,
        fullName: pkg.createdBy.fullName,
        email: pkg.createdBy.email,
        badgeNumber: pkg.createdBy.badgeNumber ?? undefined,
        role: pkg.createdBy.role as unknown as UserRole,
        departmentId: pkg.createdBy.departmentId,
        isActive: pkg.createdBy.isActive,
        mfaEnabled: pkg.createdBy.mfaEnabled,
        createdAt: pkg.createdBy.createdAt.toISOString(),
        updatedAt: pkg.createdBy.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Streams the signed export ZIP file from MinIO and logs EXPORT_DOWNLOADED.
   */
  async downloadExport(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{
    stream: Readable;
    filename: string;
    sizeBytes: number;
  }> {
    const pkg = await this.prisma.exportPackage.findUnique({
      where: { id },
      include: { case: true },
    });

    if (!pkg) {
      throw new NotFoundException(`Export package '${id}' not found`);
    }

    const hasAccess = await this.policyService.canAccessCase(user, pkg.caseId);
    if (!hasAccess) {
      throw new ForbiddenException(`ABAC Denied: Cannot download export package '${id}'`);
    }

    const storageKey = `exports/${id}.zip`;
    const buffer = await this.storageService.getBuffer(storageKey);
    const stream = await this.storageService.getStream(storageKey);

    const filename = `SDMS_EXPORT_${pkg.case.caseNumber}_${pkg.id.slice(0, 8)}.zip`;

    // Log EXPORT_DOWNLOADED on the immutable ledger
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.EXPORT_DOWNLOADED,
        entityType: 'ExportPackage',
        entityId: id,
        metadata: {
          caseId: pkg.caseId,
          caseNumber: pkg.case.caseNumber,
          manifestHash: pkg.manifestHash,
          fileSizeBytes: buffer.length,
        },
      })
      .catch((err) => this.logger.error('Failed to log EXPORT_DOWNLOADED audit entry', err));

    return {
      stream,
      filename,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Verifies an uploaded package buffer offline and logs EXPORT_VERIFIED.
   */
  async verifyPackage(
    fileBuffer: Buffer,
    user?: AuthenticatedUser,
  ): Promise<PackageVerificationResult> {
    const result = await verifyExportPackage(fileBuffer);

    if (user && result.packageId) {
      void this.auditService
        .record({
          actorId: user.id,
          action: AuditAction.EXPORT_VERIFIED,
          entityType: 'ExportPackage',
          entityId: result.packageId,
          metadata: {
            status: result.status,
            verified: result.verified,
            caseNumber: result.caseNumber,
            signatureValid: result.signatureValid,
            manifestHashValid: result.manifestHashValid,
          },
        })
        .catch((err) => this.logger.error('Failed to log EXPORT_VERIFIED audit entry', err));
    }

    return result;
  }

  /**
   * Verifies re-authentication for sensitive export creation.
   */
  private async verifyReAuthentication(
    user: AuthenticatedUser,
    passwordConfirm?: string,
  ): Promise<void> {
    if (passwordConfirm) {
      const userRecord = await this.prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!userRecord) {
        throw new NotFoundException('User record not found');
      }

      const valid = await PasswordUtil.verify(userRecord.passwordHash, passwordConfirm);
      if (!valid) {
        throw new ForbiddenException(
          'Re-authentication failed: Password confirmation did not match',
        );
      }
      return;
    }

    if (user.authTime) {
      const ageSeconds = Math.floor(Date.now() / 1000) - user.authTime;
      if (ageSeconds <= REAUTH_WINDOW_SECONDS) {
        return;
      }
    }

    throw new ForbiddenException(
      'Re-authentication required: Please confirm your password to generate a signed evidence export package',
    );
  }

  /**
   * Deterministic canonical JSON serialization.
   */
  private canonicalJson(obj: unknown): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return '[' + obj.map((item) => this.canonicalJson(item)).join(',') + ']';
    }
    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const pairs = sortedKeys
      .filter((k) => record[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${this.canonicalJson(record[k])}`);
    return '{' + pairs.join(',') + '}';
  }

  private getExtensionForMime(mimeType: string): string {
    switch (mimeType) {
      case 'application/pdf':
        return 'pdf';
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'text/plain':
        return 'txt';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'docx';
      default:
        return 'bin';
    }
  }
}
