import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';

export interface DocumentProcessingJobPayload {
  documentId: string;
  versionId: string;
}

@Injectable()
export class OcrQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OcrQueue.name);
  private queue!: Queue<DocumentProcessingJobPayload>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);

    this.queue = new Queue<DocumentProcessingJobPayload>(DOCUMENT_PROCESSING_QUEUE, {
      connection: {
        host,
        port,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    this.logger.log(`Initialized BullMQ queue '${DOCUMENT_PROCESSING_QUEUE}' on ${host}:${port}`);
  }

  async addDocumentProcessingJob(documentId: string, versionId: string): Promise<void> {
    try {
      const job = await this.queue.add(
        'process-document',
        { documentId, versionId },
        {
          jobId: `ocr-${documentId}-${versionId}-${Date.now()}`,
        },
      );
      this.logger.log(
        `Enqueued OCR job ${job.id} for document ${documentId} (version ${versionId})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to enqueue OCR job for document ${documentId}: ${(err as Error).message}`,
        err,
      );
      throw err;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log(`Closed BullMQ queue '${DOCUMENT_PROCESSING_QUEUE}'`);
    }
  }
}
