import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditAction } from '@sdms/shared-types';

interface MockLedgerEntry {
  id: string;
  sequence: bigint;
  timestamp: Date;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  prevHash: string;
  entryHash: string;
}

describe('AuditService', () => {
  let service: AuditService;
  let fakeLedger: MockLedgerEntry[] = [];

  const mockPrismaService = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    $transaction: jest.fn().mockImplementation((callback: (tx: unknown) => unknown) =>
      callback({
        $executeRaw: jest.fn().mockResolvedValue(1),
        auditLedger: {
          findFirst: jest.fn().mockImplementation(() => {
            if (fakeLedger.length === 0) return null;
            return fakeLedger[fakeLedger.length - 1];
          }),
          create: jest
            .fn()
            .mockImplementation(({ data }: { data: Omit<MockLedgerEntry, 'id'> }) => {
              const entry: MockLedgerEntry = {
                id: `uuid-${fakeLedger.length + 1}`,
                ...data,
              };
              fakeLedger.push(entry);
              return entry;
            }),
        },
      }),
    ),
    auditLedger: {
      findMany: jest.fn().mockImplementation(() => [...fakeLedger]),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        return fakeLedger.find((item) => item.id === where.id) || null;
      }),
      count: jest.fn().mockImplementation(() => fakeLedger.length),
    },
  };

  beforeEach(async () => {
    fakeLedger = [];
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('record()', () => {
    it('should create the genesis entry with sequence 1 and 64 zeroes as prevHash', async () => {
      const entry = await service.record({
        actorId: 'user-1',
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: 'user-1',
        metadata: { ip: '127.0.0.1' },
      });

      expect(entry.sequence).toBe(1);
      expect(entry.prevHash).toBe('0'.repeat(64));
      expect(entry.entryHash).toHaveLength(64);
      expect(entry.action).toBe(AuditAction.LOGIN_SUCCESS);
    });

    it('should append subsequent entries with incremented sequence and chained hash', async () => {
      const entry1 = await service.record({
        actorId: 'user-1',
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: 'user-1',
      });

      const entry2 = await service.record({
        actorId: 'user-1',
        action: AuditAction.USER_CREATED,
        entityType: 'User',
        entityId: 'user-2',
      });

      expect(entry2.sequence).toBe(2);
      expect(entry2.prevHash).toBe(entry1.entryHash);
      expect(entry2.entryHash).not.toBe(entry1.entryHash);
    });
  });

  describe('verifyChain()', () => {
    it('should return valid=true for an empty ledger', async () => {
      const res = await service.verifyChain();
      expect(res.valid).toBe(true);
      expect(res.totalEntries).toBe(0);
    });

    it('should return valid=true for a clean intact ledger', async () => {
      await service.record({
        actorId: 'user-1',
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: 'user-1',
      });
      await service.record({
        actorId: 'user-1',
        action: AuditAction.DOCUMENT_UPLOADED,
        entityType: 'Document',
        entityId: 'doc-1',
      });

      const res = await service.verifyChain();
      expect(res.valid).toBe(true);
      expect(res.totalEntries).toBe(2);
      expect(res.lastSequence).toBe(2);
    });

    it('should detect payload tampering in a ledger entry', async () => {
      await service.record({
        actorId: 'user-1',
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: 'user-1',
      });
      await service.record({
        actorId: 'user-1',
        action: AuditAction.DOCUMENT_UPLOADED,
        entityType: 'Document',
        entityId: 'doc-1',
      });

      // Tamper with the second entry's action
      fakeLedger[1].action = AuditAction.DOCUMENT_VIEWED;

      const res = await service.verifyChain();
      expect(res.valid).toBe(false);
      expect(res.corruptedAtSequence).toBe(2);
      expect(res.message).toMatch(/tampering detected/i);
    });

    it('should detect broken previous hash linkage', async () => {
      await service.record({
        actorId: 'user-1',
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: 'user-1',
      });
      await service.record({
        actorId: 'user-1',
        action: AuditAction.DOCUMENT_UPLOADED,
        entityType: 'Document',
        entityId: 'doc-1',
      });

      // Tamper with second entry's prevHash
      fakeLedger[1].prevHash = 'a'.repeat(64);

      const res = await service.verifyChain();
      expect(res.valid).toBe(false);
      expect(res.corruptedAtSequence).toBe(2);
      expect(res.message).toMatch(/link broken/i);
    });

    it('should detect a deleted entry resulting in sequence gap', async () => {
      await service.record({
        actorId: 'user-1',
        action: AuditAction.LOGIN_SUCCESS,
        entityType: 'User',
        entityId: 'user-1',
      });
      await service.record({
        actorId: 'user-1',
        action: AuditAction.DOCUMENT_UPLOADED,
        entityType: 'Document',
        entityId: 'doc-1',
      });
      await service.record({
        actorId: 'user-1',
        action: AuditAction.LOGOUT,
        entityType: 'User',
        entityId: 'user-1',
      });

      // Delete entry 2
      fakeLedger.splice(1, 1);

      const res = await service.verifyChain();
      expect(res.valid).toBe(false);
      expect(res.corruptedAtSequence).toBe(2);
      expect(res.message).toMatch(/sequence mismatch/i);
    });
  });
});
