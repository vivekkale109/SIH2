import { AuditAction } from './enums.js';

export interface AuditLedgerEntry {
  id: string;
  sequence: number;
  timestamp: string; // ISO 8601
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  prevHash: string;
  entryHash: string;
}

export interface AuditVerifyChainResult {
  valid: boolean;
  totalEntries: number;
  lastSequence: number;
  corruptedAtSequence?: number;
  message?: string;
  checkedAt: string;
}
