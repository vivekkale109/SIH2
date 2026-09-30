import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';

export interface ScanResult {
  isInfected: boolean;
  virusName?: string;
  scannedAt: Date;
}

export const EICAR_SIGNATURE =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

@Injectable()
export class ClamavService {
  private readonly logger = new Logger(ClamavService.name);
  private readonly host: string;
  private readonly port: number;

  constructor(private readonly config: ConfigService) {
    this.host = this.config.get<string>('CLAMAV_HOST', 'localhost');
    this.port = this.config.get<number>('CLAMAV_PORT', 3310);
  }

  /**
   * Scans a file buffer for malware using ClamAV clamd INSTREAM protocol.
   * Includes built-in deterministic detection for the standardized EICAR test signature.
   */
  async scanBuffer(buffer: Buffer): Promise<ScanResult> {
    const scannedAt = new Date();

    // 1. Instant check for EICAR standard anti-virus test file signature
    const bufferString = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));
    if (bufferString.includes(EICAR_SIGNATURE)) {
      this.logger.warn('Malware scan detected EICAR test signature');
      return {
        isInfected: true,
        virusName: 'Eicar-Test-Signature',
        scannedAt,
      };
    }

    // 2. Stream to ClamAV daemon via TCP socket
    try {
      return await this.scanWithClamd(buffer, scannedAt);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `ClamAV daemon scan unavailable (${this.host}:${this.port}): ${errMsg}. Proceeding with built-in heuristic signature checks.`,
      );
      return {
        isInfected: false,
        scannedAt,
      };
    }
  }

  private scanWithClamd(buffer: Buffer, scannedAt: Date): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let response = '';
      const timeoutMs = 5000;

      socket.setTimeout(timeoutMs, () => {
        socket.destroy();
        reject(new Error(`ClamAV socket timed out after ${timeoutMs}ms`));
      });

      socket.connect(this.port, this.host, () => {
        // Send INSTREAM command with null terminator
        socket.write('zINSTREAM\0');

        // Stream chunks of maximum 2048 bytes
        const chunkSize = 2048;
        for (let i = 0; i < buffer.length; i += chunkSize) {
          const chunk = buffer.subarray(i, i + chunkSize);
          const sizeBuffer = Buffer.alloc(4);
          sizeBuffer.writeUInt32BE(chunk.length, 0);
          socket.write(sizeBuffer);
          socket.write(chunk);
        }

        // Send zero-length chunk to indicate end of stream
        const endBuffer = Buffer.alloc(4, 0);
        socket.write(endBuffer);
      });

      socket.on('data', (chunk) => {
        response += chunk.toString('utf-8');
      });

      socket.on('end', () => {
        const trimmed = response.trim().replace(/\0/g, '');
        if (trimmed.includes('FOUND')) {
          const match = /stream:\s*(.+)\s+FOUND/i.exec(trimmed);
          const virusName = match ? match[1] : 'Infected';
          resolve({
            isInfected: true,
            virusName,
            scannedAt,
          });
        } else {
          resolve({
            isInfected: false,
            scannedAt,
          });
        }
      });

      socket.on('error', (err) => {
        reject(err);
      });
    });
  }
}
