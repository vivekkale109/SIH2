'use client';

import React from 'react';
import Link from 'next/link';
import {
  Settings,
  Shield,
  Lock,
  KeyRound,
  FileCheck2,
  HardDrive,
  Database,
  CheckCircle2,
  Sliders,
  Cpu,
  Fingerprint,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/15 text-primary font-mono uppercase">
              Phase 8 Feature
            </span>
            <span className="text-xs text-muted">• System Configuration</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-2 flex items-center space-x-2.5">
            <Settings className="h-7 w-7 text-primary" />
            <span>System Architecture & Cryptographic Settings</span>
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Immutable operational parameters, security token lifecycles, cryptographic signature
            schemes, and statutory compliance enforcement.
          </p>
        </div>
      </div>

      {/* Security & Authentication Configuration */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-text flex items-center space-x-2">
          <Lock className="w-5 h-5 text-primary" />
          <span>Authentication & Security Policies</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Password Hashing
            </span>
            <h3 className="text-sm font-bold text-text">Argon2id (RFC 9106)</h3>
            <p className="text-xs text-muted">
              Memory: 64 MB · Iterations: 3 · Parallelism: 1. Side-channel and GPU-resistant.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Rate Limiting & Lockout
            </span>
            <h3 className="text-sm font-bold text-text">5 Attempts / 15-Min Lockout</h3>
            <p className="text-xs text-muted">
              Automatic account lockout upon 5 consecutive failed credential attempts.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Token Lifecycles
            </span>
            <h3 className="text-sm font-bold text-text">15m Access · 7d Refresh</h3>
            <p className="text-xs text-muted">
              Rotating refresh tokens stored with SHA-256 hashes; automatic replay detection.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Re-authentication Guard
            </span>
            <h3 className="text-sm font-bold text-text">15-Minute Sliding Window</h3>
            <p className="text-xs text-muted">
              Password confirmation required for high-risk actions (Exports, Shares, Deletion).
            </p>
          </div>
        </div>
      </div>

      {/* Cryptographic Standards */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-text flex items-center space-x-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          <span>Cryptographic Engine & Admissibility Algorithms</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Export Digital Signatures
            </span>
            <h3 className="text-sm font-bold text-text">Ed25519 (EdDSA Curve25519)</h3>
            <p className="text-xs text-muted">
              Compact 64-byte high-security signatures providing court-proven non-repudiation.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Audit Ledger Chaining
            </span>
            <h3 className="text-sm font-bold text-text">Canonical SHA-256</h3>
            <p className="text-xs text-muted">
              Deterministic recursive JSON serialization chained back to Genesis null hash
              (0x00...00).
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Object Storage Encryption
            </span>
            <h3 className="text-sm font-bold text-text">AES-256 Server-Side (SSE)</h3>
            <p className="text-xs text-muted">
              MinIO S3-compatible encrypted buckets for evidence documents and export archives.
            </p>
          </div>

          <div className="p-4 bg-surface-alt border border-border rounded-lg space-y-1">
            <span className="text-[10px] font-mono text-muted uppercase font-bold">
              Forensic Watermarking
            </span>
            <h3 className="text-sm font-bold text-text">Sharp + PDF-Lib On-The-Fly</h3>
            <p className="text-xs text-muted">
              Dynamic pixel compositing without persistent disk duplication.
            </p>
          </div>
        </div>
      </div>

      {/* Statutory Mandates & Regulatory Compliance */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-text flex items-center space-x-2">
          <FileCheck2 className="w-5 h-5 text-primary" />
          <span>Statutory Framework Alignment</span>
        </h2>
        <div className="space-y-2 text-xs text-muted">
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p>
              <strong className="text-text">Bharatiya Sakshya Adhiniyam, 2023 (§61–63):</strong>{' '}
              Mandates evidence certificate generation, hash matching, and lawful custody
              demonstration.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p>
              <strong className="text-text">
                Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS):
              </strong>{' '}
              Case lifecycle progression and investigation timeline auditing.
            </p>
          </div>
          <div className="flex items-start space-x-2">
            <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
            <p>
              <strong className="text-text">Information Technology Act, 2000 (§66, §70):</strong>{' '}
              Strict protection of protected computer systems and tamper-evident audit ledgers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
