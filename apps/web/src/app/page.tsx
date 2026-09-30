import React from 'react';
import {
  ShieldCheck,
  Server,
  Database,
  HardDrive,
  FileCheck,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { ClassificationBadge, Badge } from '@/components/ui/Badge';
import { ClassificationLevel } from '@sdms/shared-types';

export default function HomePage() {
  const infraServices = [
    {
      name: 'NestJS Core API',
      port: '4000',
      icon: Server,
      status: 'Online',
      desc: 'Modular backend with Swagger & ABAC',
    },
    {
      name: 'PostgreSQL Database',
      port: '5432',
      icon: Database,
      status: 'Configured',
      desc: 'Prisma schema & GIN FTS index',
    },
    {
      name: 'MinIO Object Storage',
      port: '9002 / 9001',
      icon: HardDrive,
      status: 'Configured',
      desc: 'S3-compatible AES-256 SSE',
    },
    {
      name: 'Redis + BullMQ',
      port: '6379',
      icon: Layers,
      status: 'Configured',
      desc: 'Async OCR & classification queues',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-lg p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary font-mono uppercase">
              Phase 0 Foundation
            </span>
            <span className="text-xs text-muted">• Smart India Hackathon 2026 (PS ID 26190)</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-2">
            Secure Digital Document Management System (SDMS)
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Case-centric legal evidence platform with granular RBAC/ABAC, SHA-256 integrity,
            append-only hash-chained ledger, and BSA 2023 §61–63 signed exports.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant="success" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            System Integrity OK
          </Badge>
        </div>
      </div>

      {/* Metrics / Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Architecture</p>
          <p className="text-lg font-bold text-text mt-1">Modular Monolith</p>
          <p className="text-xs text-muted mt-2">NestJS + Next.js App Router</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Audit Ledger</p>
          <p className="text-lg font-bold text-text mt-1">Hash-Chained</p>
          <p className="text-xs text-muted mt-2 font-mono">SHA-256(prev || canonical_json)</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Storage & Hashing</p>
          <p className="text-lg font-bold text-text mt-1">MinIO + SHA-256</p>
          <p className="text-xs text-muted mt-2">AES-256 SSE at rest</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5 shadow-sm">
          <p className="text-xs font-medium text-muted">Legal Compliance</p>
          <p className="text-lg font-bold text-text mt-1">BSA 2023 §61–63</p>
          <p className="text-xs text-muted mt-2">Ed25519 verifiable packages</p>
        </div>
      </div>

      {/* Infrastructure Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Infrastructure & Foundation Services</h2>
          <span className="text-xs font-mono text-muted">docker-compose.yml ready</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infraServices.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.name}
                className="bg-surface border border-border rounded-lg p-4 flex items-start space-x-4 shadow-sm"
              >
                <div className="bg-surface-alt p-2.5 rounded-lg border border-border text-primary shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-text">{svc.name}</h3>
                    <Badge variant="success" icon={<CheckCircle2 className="w-3 h-3" />}>
                      {svc.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted mt-1">{svc.desc}</p>
                  <p className="text-[11px] font-mono text-muted mt-2">Port: {svc.port}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Classification Levels & Security Showcase */}
      <div className="bg-surface border border-border rounded-lg p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-text">
          Classification Hierarchy & Security Tokens
        </h2>
        <p className="text-sm text-muted">
          All case files and evidence strictly enforce document-level ABAC attributes with clear
          visual classification indicators:
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <ClassificationBadge level={ClassificationLevel.PUBLIC} />
          <ClassificationBadge level={ClassificationLevel.RESTRICTED} />
          <ClassificationBadge level={ClassificationLevel.CONFIDENTIAL} />
          <ClassificationBadge level={ClassificationLevel.SECRET} />
        </div>
      </div>

      {/* Phase Progression Card */}
      <div className="bg-surface-alt border border-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Next Step
          </span>
          <h3 className="text-base font-bold text-text mt-0.5">
            Phase 1: Authentication, MFA, and RBAC
          </h3>
          <p className="text-xs text-muted mt-1">
            Argon2id password hashing, TOTP MFA enrollment, JWT + rotating refresh tokens, and 6
            role profiles.
          </p>
        </div>
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center space-x-2 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-md hover:bg-primary-hover transition-colors shrink-0"
        >
          <span>Explore Swagger API Docs</span>
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
