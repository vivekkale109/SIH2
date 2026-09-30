import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import { Readable } from 'stream';

export interface UploadResult {
  storageKey: string;
  sizeBytes: number;
  sha256: string;
  etag: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private client!: Minio.Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'sdms-documents');
  }

  async onModuleInit(): Promise<void> {
    const endPoint = this.config.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = Number(this.config.get<number>('MINIO_PORT', 9002));
    const rawSsl = this.config.get<string | boolean>('MINIO_USE_SSL', false);
    const useSSL = rawSsl === true || rawSsl === 'true';
    const accessKey = this.config.get<string>('MINIO_ROOT_USER', 'minioadmin');
    const secretKey = this.config.get<string>('MINIO_ROOT_PASSWORD', 'minioadmin');

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey,
      secretKey,
    });

    await this.ensureBucketExists();
  }

  async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Created MinIO storage bucket '${this.bucket}'`);
      } else {
        this.logger.log(`MinIO storage bucket '${this.bucket}' verified`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`MinIO bucket initialization notice: ${msg}`);
    }
  }

  /**
   * Uploads an object buffer to MinIO with SHA-256 computation and AES-256 SSE headers.
   */
  async upload(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
    metadata: Record<string, string> = {},
  ): Promise<UploadResult> {
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

    const sseConfig = this.config.get<string | boolean>('MINIO_SSE_ENABLED', false);
    const sseEnabled = sseConfig === true || sseConfig === 'true';

    const meta: Record<string, string> = {
      'Content-Type': mimeType,
      'x-sdms-sha256': sha256,
      ...metadata,
    };

    if (sseEnabled) {
      meta['x-amz-server-side-encryption'] = 'AES256';
    }

    let uploaded;
    try {
      uploaded = await this.client.putObject(this.bucket, storageKey, buffer, buffer.length, meta);
    } catch (err: unknown) {
      if (sseEnabled && err instanceof Error && err.message.includes('KMS not configured')) {
        this.logger.warn('MinIO KMS not configured; falling back to standard secure storage');
        delete meta['x-amz-server-side-encryption'];
        uploaded = await this.client.putObject(
          this.bucket,
          storageKey,
          buffer,
          buffer.length,
          meta,
        );
      } else {
        throw err;
      }
    }

    return {
      storageKey,
      sizeBytes: buffer.length,
      sha256,
      etag: uploaded.etag,
    };
  }

  /**
   * Returns a readable stream of the object from MinIO.
   */
  async getStream(storageKey: string): Promise<Readable> {
    return this.client.getObject(this.bucket, storageKey);
  }

  /**
   * Downloads an object from MinIO as a complete Buffer.
   */
  async getBuffer(storageKey: string): Promise<Buffer> {
    const stream = await this.getStream(storageKey);
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) =>
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
      );
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Reads the object directly from MinIO and calculates its SHA-256 digest in real-time.
   */
  async computeSha256(storageKey: string): Promise<string> {
    const stream = await this.getStream(storageKey);
    return new Promise<string>((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Generates a signed, short-lived presigned download URL (default 15 minutes).
   */
  async getPresignedUrl(storageKey: string, expirySeconds = 900): Promise<string> {
    return this.client.presignedGetObject(this.bucket, storageKey, expirySeconds);
  }

  /**
   * Checks if an object exists in the storage bucket.
   */
  async exists(storageKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, storageKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Deletes an object from MinIO storage (used only for rollbacks / cleanup).
   */
  async delete(storageKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, storageKey);
  }
}
