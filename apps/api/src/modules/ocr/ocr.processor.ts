import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, DocumentStatus } from '@sdms/shared-types';
import { OcrService } from './services/ocr.service';
import { DOCUMENT_PROCESSING_QUEUE, DocumentProcessingJobPayload } from './ocr.queue';

@Injectable()
export class OcrProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcrProcessor.name);
  private worker!: Worker<DocumentProcessingJobPayload>;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly ocrService: OcrService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.worker = new Worker<DocumentProcessingJobPayload>(
      DOCUMENT_PROCESSING_QUEUE,
      async (job: Job<DocumentProcessingJobPayload>) => {
        return this.processDocumentJob(job.data);
      },
      {
        connection: {
          host,
          port,
          maxRetriesPerRequest: null,
        },
        concurrency: 2,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(
        `OCR job ${job.id} completed successfully for document ${job.data.documentId}`,
      );
    });

    this.worker.on('failed', async (job, err) => {
      this.logger.error(
        `OCR job ${job?.id} failed for document ${job?.data.documentId}: ${err.message}`,
        err.stack,
      );
      if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        await this.handleFatalJobFailure(job.data, err.message);
      }
    });

    this.logger.log(`BullMQ OCR Worker listening on '${DOCUMENT_PROCESSING_QUEUE}'`);
  }

  async processDocumentJob(
    payload: DocumentProcessingJobPayload,
  ): Promise<Record<string, unknown>> {
    const { documentId, versionId } = payload;
    this.logger.log(`Processing OCR for document: ${documentId}, version: ${versionId}`);

    // 1. Fetch version and document
    const version = await this.prisma.documentVersion.findUnique({
      where: { id: versionId },
      include: { document: true, ocrResult: true },
    });

    if (!version || !version.document) {
      throw new Error(`DocumentVersion ${versionId} or parent Document ${documentId} not found`);
    }

    // Preserve human-verified transcripts
    if (version.ocrResult?.verifiedById) {
      this.logger.log(
        `Document version ${versionId} is already human-verified; preserving verified transcript.`,
      );
      return { success: true, verified: true };
    }

    // Update document status to PROCESSING
    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: DocumentStatus.PROCESSING },
    });

    try {
      // 2. Download file buffer from MinIO object storage
      const buffer = await this.storageService.getBuffer(version.storageKey);

      // 3. Run OCR, Rule-based classification, and Metadata extraction
      const ocrResult = await this.ocrService.processDocumentBuffer(buffer, version.mimeType);

      // 4. Determine status: READY if confidence >= 0.70, otherwise NEEDS_REVIEW
      const status =
        ocrResult.confidence >= 0.7 ? DocumentStatus.READY : DocumentStatus.NEEDS_REVIEW;

      // 5. Update Database within transaction
      await this.prisma.$transaction(async (tx) => {
        const metaJson = JSON.parse(
          JSON.stringify({
            ...ocrResult.metadata,
            detectedType: ocrResult.classification.detectedType,
            matchedRules: ocrResult.classification.matchedRules,
          }),
        ) as Prisma.InputJsonValue;

        // Upsert OcrResult
        await tx.ocrResult.upsert({
          where: { versionId },
          create: {
            versionId,
            extractedText: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            extractedMetadata: metaJson,
          },
          update: {
            extractedText: ocrResult.extractedText,
            confidence: ocrResult.confidence,
            extractedMetadata: metaJson,
          },
        });

        // Update Document status and type if detected
        const updateData: {
          status: DocumentStatus;
          processingError: null;
          type?: string;
        } = {
          status,
          processingError: null,
        };

        if (
          version.document.type === 'OTHER' ||
          version.document.type === 'UNCLASSIFIED' ||
          !version.document.type
        ) {
          updateData.type = ocrResult.classification.detectedType;
        }

        await tx.document.update({
          where: { id: documentId },
          data: updateData,
        });
      });

      // 6. Record Audit Ledger Event
      void this.auditService
        .record({
          actorId: version.document.createdById,
          action: AuditAction.OCR_PROCESSED,
          entityType: 'Document',
          entityId: documentId,
          metadata: {
            versionId,
            versionNo: version.versionNo,
            confidence: ocrResult.confidence,
            detectedType: ocrResult.classification.detectedType,
            status,
          },
        })
        .catch((err) =>
          this.logger.error(`Failed to record OCR_PROCESSED audit entry: ${err.message}`),
        );

      return {
        success: true,
        documentId,
        versionId,
        status,
        confidence: ocrResult.confidence,
        detectedType: ocrResult.classification.detectedType,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`OCR processing error for document ${documentId}: ${errorMsg}`);

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          processingError: errorMsg,
        },
      });

      throw err;
    }
  }

  private async handleFatalJobFailure(
    payload: DocumentProcessingJobPayload,
    errorMsg: string,
  ): Promise<void> {
    try {
      await this.prisma.document.update({
        where: { id: payload.documentId },
        data: {
          status: DocumentStatus.FAILED,
          processingError: `OCR failed after 3 attempts: ${errorMsg}`,
        },
      });

      void this.auditService
        .record({
          actorId: 'system',
          action: AuditAction.OCR_PROCESSED,
          entityType: 'Document',
          entityId: payload.documentId,
          metadata: {
            versionId: payload.versionId,
            status: DocumentStatus.FAILED,
            error: errorMsg,
          },
        })
        .catch((e) => this.logger.error('Failed to record OCR failure audit', e));
    } catch (err) {
      this.logger.error(
        `Failed to mark document ${payload.documentId} as FAILED: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.logger.log(`Closed BullMQ OCR Worker for '${DOCUMENT_PROCESSING_QUEUE}'`);
    }
  }
}
