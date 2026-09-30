'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Server,
  Database,
  HardDrive,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
  UserCheck,
  QrCode,
  KeyRound,
  FileCheck,
  Briefcase,
  ScrollText,
  Upload,
} from 'lucide-react';
import { ClassificationBadge, Badge } from '@/components/ui/Badge';
import { ClassificationLevel } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  const infraServices = [
    {
      name: 'NestJS Core API',
      port: '4000',
      icon: Server,
      status: 'Online',
      desc: 'Auth, MFA, Users, Health, and Swagger at /api/docs',
    },
    {
      name: 'PostgreSQL Database',
      port: '5432',
      icon: Database,
      status: 'Seeded & Active',
      desc: 'Users, Departments, Tokens, Audit Ledger schema',
    },
    {
      name: 'MinIO Object Storage',
      port: '9002 / 9001',
      icon: HardDrive,
      status: 'Connected',
      desc: 'S3-compatible AES-256 SSE object store',
    },
    {
      name: 'Redis + BullMQ',
      port: '6379',
      icon: Layers,
      status: 'Connected',
      desc: 'Async worker queue backend for OCR and hashing',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-success/15 text-success font-mono uppercase">
              Phase 4 Operational
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
            MinIO SSE & SHA-256 Active
          </Badge>
        </div>
      </div>

      {/* Authenticated Persona Banner */}
      {user && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
              {user.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-text">{user.fullName}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white">
                  {user.role}
                </span>
                {user.mfaEnabled && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-success/20 text-success">
                    TOTP Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                Badge: <span className="font-mono text-text">{user.badgeNumber || 'N/A'}</span> ·
                Department: <span className="font-medium text-text">{user.departmentId}</span> ·
                Email: {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 flex-wrap">
            <Link
              href="/cases"
              className="inline-flex items-center space-x-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Browse Cases</span>
            </Link>
            <Link
              href="/upload"
              className="inline-flex items-center space-x-1.5 bg-surface hover:bg-surface-alt border border-border text-text text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>Ingest Evidence</span>
            </Link>
            <Link
              href="/audit"
              className="inline-flex items-center space-x-1.5 bg-surface hover:bg-surface-alt border border-border text-text text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <ScrollText className="w-3.5 h-3.5 text-primary" />
              <span>Audit Ledger</span>
            </Link>
            <Link
              href="/mfa"
              className="inline-flex items-center space-x-1.5 bg-surface hover:bg-surface-alt border border-border text-text text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-primary" />
              <span>2FA</span>
            </Link>
          </div>
        </div>
      )}

      {/* Metrics / Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Authentication</p>
            <Lock className="w-4 h-4 text-primary" />
          </div>
          <p className="text-lg font-bold text-text mt-1">Argon2id + TOTP</p>
          <p className="text-xs text-muted mt-2">15-min lockout on 5 failures</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Authorization</p>
            <UserCheck className="w-4 h-4 text-accent" />
          </div>
          <p className="text-lg font-bold text-text mt-1">6 RBAC Profiles</p>
          <p className="text-xs text-muted mt-2">RolesGuard + ReAuthGuard</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Token Lifecycles</p>
            <KeyRound className="w-4 h-4 text-warning" />
          </div>
          <p className="text-lg font-bold text-text mt-1">JWT + Rotating RT</p>
          <p className="text-xs text-muted mt-2">15m Access · 7d Refresh</p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted">Legal Compliance</p>
            <FileCheck className="w-4 h-4 text-success" />
          </div>
          <p className="text-lg font-bold text-text mt-1">BSA 2023 §61–63</p>
          <p className="text-xs text-muted mt-2">Ed25519 verifiable packages</p>
        </div>
      </div>

      {/* Infrastructure Services Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Core Infrastructure & Micro-Services</h2>
          <span className="text-xs font-mono text-muted">Docker Compose Services Running</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {infraServices.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.name}
                className="bg-surface border border-border rounded-xl p-4 flex items-start space-x-4 shadow-sm"
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

      {/* Classification Levels Showcase */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
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

      {/* Next Step: Phase 2 Banner */}
      <div className="bg-surface-alt border border-border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Up Next
          </span>
          <h3 className="text-base font-bold text-text mt-0.5">
            Phase 4: Secure Document Upload & Versioning
          </h3>
          <p className="text-xs text-muted mt-1">
            MinIO encrypted object storage, ClamAV anti-malware streaming scan, SHA-256 integrity
            digests, and immutable document versioning.
          </p>
        </div>
        <a
          href="http://localhost:4000/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center space-x-2 bg-primary text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-primary-hover transition-colors shrink-0"
        >
          <span>Explore Swagger API Docs</span>
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}
