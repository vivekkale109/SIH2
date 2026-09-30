import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  canonicalJson,
  sha256Hex,
  secureTimingCompare,
} from '../../common/utils/canonical-json.util';
import {
  AuditAction,
  AuditLedgerEntry,
  AuditVerifyChainResult,
  PaginatedResult,
} from '@sdms/shared-types';
import { QueryAuditDto } from './dto/query-audit.dto';

export interface RecordAuditParams {
  actorId: string;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private static readonly GENESIS_PREV_HASH = '0'.repeat(64);
  private static readonly ADVISORY_LOCK_ID = 73827101;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Appends an immutable, hash-chained entry to the audit ledger.
   * Guaranteed gapless and serialized via an exclusive PostgreSQL advisory transaction lock.
   */
  async record(params: RecordAuditParams): Promise<AuditLedgerEntry> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Acquire transaction-level advisory lock to serialize ledger appends
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${AuditService.ADVISORY_LOCK_ID})`;

      // 2. Fetch the latest entry to determine next sequence and previous hash
      const latest = await tx.auditLedger.findFirst({
        orderBy: { sequence: 'desc' },
      });

      const sequence = latest ? latest.sequence + BigInt(1) : BigInt(1);
      const prevHash = latest ? latest.entryHash : AuditService.GENESIS_PREV_HASH;
      const timestamp = new Date();

      // 3. Construct payload and compute canonical entry hash
      const payload = {
        action: params.action,
        actorId: params.actorId,
        entityId: params.entityId,
        entityType: params.entityType,
        metadata: params.metadata || {},
        prevHash,
        sequence: Number(sequence),
        timestamp: timestamp.toISOString(),
      };

      const payloadCanonicalJson = canonicalJson(payload);
      const entryHash = sha256Hex(prevHash + payloadCanonicalJson);

      // 4. Insert append-only record
      const created = await tx.auditLedger.create({
        data: {
          sequence,
          timestamp,
          actorId: params.actorId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: (params.metadata || {}) as Prisma.InputJsonValue,
          prevHash,
          entryHash,
        },
      });

      this.logger.debug(
        `Audit record created [seq=${sequence} action=${params.action} hash=${entryHash.substring(0, 8)}...]`,
      );

      return this.mapToEntry(created);
    });
  }

  /**
   * Verifies the cryptographic integrity of the entire audit ledger chain.
   * Validates:
   * 1. Monotonic gapless sequence: seq[i] == i + 1
   * 2. Hash chaining: prevHash[i] == entryHash[i-1] (genesis prevHash == 64 zeroes)
   * 3. Payload integrity: entryHash[i] == SHA-256(prevHash[i] + canonical_json(payload[i]))
   */
  async verifyChain(): Promise<AuditVerifyChainResult> {
    const entries = await this.prisma.auditLedger.findMany({
      orderBy: { sequence: 'asc' },
    });

    const checkedAt = new Date().toISOString();

    if (entries.length === 0) {
      return {
        valid: true,
        totalEntries: 0,
        lastSequence: 0,
        checkedAt,
      };
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;

      const expectedSequence = BigInt(i + 1);

      // 1. Check sequence ordering and gapless progression
      if (entry.sequence !== expectedSequence) {
        this.logger.error(
          `Audit verification failed: Sequence gap at index ${i}. Expected ${expectedSequence}, found ${entry.sequence}`,
        );
        return {
          valid: false,
          totalEntries: entries.length,
          lastSequence: Number(entries[entries.length - 1]?.sequence || 0),
          corruptedAtSequence: i + 1,
          message: `Sequence mismatch at position ${i + 1}: expected ${expectedSequence}, found ${entry.sequence}`,
          checkedAt,
        };
      }

      // 2. Check previous hash connection
      const expectedPrevHash = i === 0 ? AuditService.GENESIS_PREV_HASH : entries[i - 1]?.entryHash;

      if (!expectedPrevHash || !secureTimingCompare(entry.prevHash, expectedPrevHash)) {
        this.logger.error(
          `Audit verification failed: Broken hash link at sequence ${entry.sequence}. Expected prevHash: ${expectedPrevHash}, found: ${entry.prevHash}`,
        );
        return {
          valid: false,
          totalEntries: entries.length,
          lastSequence: Number(entries[entries.length - 1]?.sequence || 0),
          corruptedAtSequence: Number(entry.sequence),
          message: `Hash chain link broken at sequence ${entry.sequence}`,
          checkedAt,
        };
      }

      // 3. Recompute and verify payload hash
      const payload = {
        action: entry.action,
        actorId: entry.actorId,
        entityId: entry.entityId,
        entityType: entry.entityType,
        metadata: entry.metadata as Record<string, unknown>,
        prevHash: entry.prevHash,
        sequence: Number(entry.sequence),
        timestamp: entry.timestamp.toISOString(),
      };

      const computedHash = sha256Hex(entry.prevHash + canonicalJson(payload));

      if (!secureTimingCompare(entry.entryHash, computedHash)) {
        this.logger.error(
          `Audit verification failed: Tampered payload at sequence ${entry.sequence}. Expected hash: ${computedHash}, found: ${entry.entryHash}`,
        );
        return {
          valid: false,
          totalEntries: entries.length,
          lastSequence: Number(entries[entries.length - 1]?.sequence || 0),
          corruptedAtSequence: Number(entry.sequence),
          message: `Entry hash tampering detected at sequence ${entry.sequence}`,
          checkedAt,
        };
      }
    }

    const lastEntry = entries[entries.length - 1];
    return {
      valid: true,
      totalEntries: entries.length,
      lastSequence: lastEntry ? Number(lastEntry.sequence) : 0,
      checkedAt,
    };
  }

  /**
   * Retrieves paginated audit ledger records with role-based filtering.
   */
  async findAll(query: QueryAuditDto): Promise<PaginatedResult<AuditLedgerEntry>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLedgerWhereInput = {};

    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.action) {
      where.action = query.action;
    }
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.entityId) {
      where.entityId = query.entityId;
    }
    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLedger.count({ where }),
      this.prisma.auditLedger.findMany({
        where,
        orderBy: { sequence: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items: items.map((item) => this.mapToEntry(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Retrieves a single ledger entry by UUID.
   */
  async findById(id: string): Promise<AuditLedgerEntry> {
    const item = await this.prisma.auditLedger.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException(`Audit record with ID '${id}' not found`);
    }

    return this.mapToEntry(item);
  }

  private mapToEntry(raw: {
    id: string;
    sequence: bigint;
    timestamp: Date;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata: Prisma.JsonValue;
    prevHash: string;
    entryHash: string;
  }): AuditLedgerEntry {
    return {
      id: raw.id,
      sequence: Number(raw.sequence),
      timestamp: raw.timestamp.toISOString(),
      actorId: raw.actorId,
      action: raw.action as AuditAction,
      entityType: raw.entityType,
      entityId: raw.entityId,
      metadata: (raw.metadata || {}) as Record<string, unknown>,
      prevHash: raw.prevHash,
      entryHash: raw.entryHash,
    };
  }
}
