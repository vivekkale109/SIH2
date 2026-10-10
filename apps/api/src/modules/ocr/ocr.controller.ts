import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { PolicyService } from '../cases/policy/policy.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { OcrQueue } from './ocr.queue';
import { OcrProcessor } from './ocr.processor';
import { UpdateOcrVerificationDto } from './dto/update-ocr-verification.dto';
import { AuditAction, DocumentStatus } from '@sdms/shared-types';

@Controller('documents/:id/ocr')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OcrController {
  private readonly logger = new Logger(OcrController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyService: PolicyService,
    private readonly auditService: AuditService,
    private readonly ocrQueue: OcrQueue,
    private readonly ocrProcessor: OcrProcessor,
  ) {}

  /**
   * Retrieves the OCR result and extracted metadata for the current version of a document.
   */
  @Get()
  async getOcrResult(
    @Param('id') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: true,
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
          include: {
            ocrResult: true,
          },
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

    const latestVersion = doc.versions[0];
    const ocrResult = latestVersion?.ocrResult;

    return {
      documentId: doc.id,
      versionId: latestVersion?.id,
      versionNo: latestVersion?.versionNo,
      status: doc.status,
      processingError: doc.processingError,
      ocrResult: ocrResult
        ? {
            id: ocrResult.id,
            versionId: ocrResult.versionId,
            extractedText: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            extractedMetadata: ocrResult.extractedMetadata,
            verifiedById: ocrResult.verifiedById,
            verifiedAt: ocrResult.verifiedAt ? ocrResult.verifiedAt.toISOString() : null,
            createdAt: ocrResult.createdAt.toISOString(),
            updatedAt: ocrResult.updatedAt.toISOString(),
          }
        : null,
    };
  }

  /**
   * Manually retries or triggers OCR processing for a document.
   */
  @Post('retry')
  async retryOcr(
    @Param('id') documentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string; status: DocumentStatus }> {
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

    const hasAccess = await this.policyService.canAccessCase(user, doc.caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not authorized to retry OCR for document '${documentId}'`,
      );
    }

    const version = doc.versions[0];
    if (!version) {
      throw new NotFoundException(`No version found for document '${documentId}'`);
    }

    // Reset status to PROCESSING and clear error
    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: DocumentStatus.PROCESSING,
        processingError: null,
      },
    });

    // Enqueue job via BullMQ
    await this.ocrQueue.addDocumentProcessingJob(documentId, version.id);

    return {
      success: true,
      message: `OCR processing job re-enqueued for document ${documentId}`,
      status: DocumentStatus.PROCESSING,
    };
  }

  /**
   * Human verification and editing of OCR transcript and extracted metadata.
   */
  @Patch('verify')
  async verifyOcr(
    @Param('id') documentId: string,
    @Body() dto: UpdateOcrVerificationDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<Record<string, unknown>> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        case: true,
        versions: {
          orderBy: { versionNo: 'desc' },
          take: 1,
          include: { ocrResult: true },
        },
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document with ID '${documentId}' not found`);
    }

    const hasAccess = await this.policyService.canAccessCase(user, doc.caseId);
    if (!hasAccess) {
      throw new ForbiddenException(
        `ABAC Denied: User '${user.email}' is not authorized to verify document '${documentId}'`,
      );
    }

    const version = doc.versions[0];
    if (!version) {
      throw new NotFoundException(`No version found for document '${documentId}'`);
    }

    const previousClassification = doc.classification;
    const previousType = doc.type;

    // Update in database transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert or update OcrResult with verified data
      const ocrRecord = await tx.ocrResult.upsert({
        where: { versionId: version.id },
        create: {
          versionId: version.id,
          extractedText: dto.extractedText || '[No OCR text available]',
          confidence: 1.0, // Human verified is 100% confidence
          extractedMetadata: (dto.extractedMetadata || {}) as object,
          verifiedById: user.id,
          verifiedAt: new Date(),
        },
        update: {
          ...(dto.extractedText !== undefined ? { extractedText: dto.extractedText } : {}),
          ...(dto.extractedMetadata !== undefined
            ? { extractedMetadata: dto.extractedMetadata as object }
            : {}),
          confidence: 1.0,
          verifiedById: user.id,
          verifiedAt: new Date(),
        },
      });

      // 2. Update Document status to READY, and optionally update type or classification
      const docUpdates: {
        status: DocumentStatus;
        processingError: null;
        type?: string;
        classification?: typeof previousClassification;
      } = {
        status: DocumentStatus.READY,
        processingError: null,
      };

      if (dto.type) {
        docUpdates.type = dto.type;
      }
      if (dto.classification) {
        docUpdates.classification = dto.classification as typeof previousClassification;
      }

      const updatedDoc = await tx.document.update({
        where: { id: documentId },
        data: docUpdates,
      });

      return { ocrRecord, updatedDoc };
    });

    // 3. Record Audit Ledger Events
    void this.auditService
      .record({
        actorId: user.id,
        action: AuditAction.OCR_VERIFIED,
        entityType: 'Document',
        entityId: documentId,
        metadata: {
          versionId: version.id,
          verifiedBy: user.email,
          previousType,
          newType: updated.updatedDoc.type,
          status: DocumentStatus.READY,
        },
      })
      .catch((err) => this.logger.error('Failed to log OCR_VERIFIED audit entry', err));

    if (dto.classification && dto.classification !== previousClassification) {
      void this.auditService
        .record({
          actorId: user.id,
          action: AuditAction.CLASSIFICATION_UPDATED,
          entityType: 'Document',
          entityId: documentId,
          metadata: {
            from: previousClassification,
            to: dto.classification,
          },
        })
        .catch((err) => this.logger.error('Failed to log CLASSIFICATION_UPDATED audit', err));
    }

    return {
      success: true,
      message: 'OCR data and document classification verified successfully',
      document: {
        id: updated.updatedDoc.id,
        type: updated.updatedDoc.type,
        classification: updated.updatedDoc.classification,
        status: updated.updatedDoc.status,
      },
      ocrResult: {
        id: updated.ocrRecord.id,
        extractedText: updated.ocrRecord.extractedText,
        confidence: updated.ocrRecord.confidence,
        extractedMetadata: updated.ocrRecord.extractedMetadata,
        verifiedById: updated.ocrRecord.verifiedById,
        verifiedAt: updated.ocrRecord.verifiedAt?.toISOString(),
      },
    };
  }
}
