'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  Shield,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { ClassificationBadge } from '@/components/ui/Badge';
import { ClassificationLevel, UserRole } from '@sdms/shared-types';

export default function ClassificationPage() {
  const [testRole, setTestRole] = useState<UserRole>(UserRole.INVESTIGATOR);
  const [testClassification, setTestClassification] = useState<ClassificationLevel>(
    ClassificationLevel.CONFIDENTIAL,
  );
  const [isSameDept, setIsSameDept] = useState(true);
  const [isAssigned, setIsAssigned] = useState(false);
  const [hasActiveShare, setHasActiveShare] = useState(false);

  // Clearance evaluation function mimicking backend PolicyService
  const evaluateClearance = () => {
    // Admin and Auditor have global read
    if (testRole === UserRole.ADMIN || testRole === UserRole.AUDITOR) {
      return {
        allowed: true,
        reason: 'Global system inspection clearance granted by role profile',
      };
    }

    // Active share grant grants access regardless of department
    if (hasActiveShare) {
      return {
        allowed: true,
        reason: 'Access granted via active, unexpired cryptographic ShareGrant',
      };
    }

    // Direct assignment grants case access
    if (isAssigned) {
      return { allowed: true, reason: 'Access granted via direct CaseMember role assignment' };
    }

    // Department boundary
    if (!isSameDept) {
      return {
        allowed: false,
        reason:
          'DENIED: Cross-department access requires explicit ShareGrant or CaseMember assignment',
      };
    }

    // Role-level classification ceiling
    if (testClassification === ClassificationLevel.SECRET) {
      return {
        allowed: false,
        reason:
          'DENIED: SECRET classification requires direct case assignment (Lead Investigator / Prosecutor)',
      };
    }

    if (testClassification === ClassificationLevel.CONFIDENTIAL) {
      if (testRole === UserRole.COURT_OFFICER) {
        return {
          allowed: false,
          reason: 'DENIED: Court Officer requires explicit case share for CONFIDENTIAL records',
        };
      }
      return { allowed: true, reason: 'Allowed under departmental CONFIDENTIAL clearance ceiling' };
    }

    return { allowed: true, reason: 'Allowed under departmental RESTRICTED / PUBLIC clearance' };
  };

  const clearanceResult = evaluateClearance();

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/15 text-primary font-mono uppercase">
              Phase 8 Feature
            </span>
            <span className="text-xs text-muted">• ABAC Security Rules</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-2 flex items-center space-x-2.5">
            <Layers className="h-7 w-7 text-primary" />
            <span>Classification Hierarchy & Security Rules</span>
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Attribute-Based Access Control (ABAC) evaluation matrix combining role clearance
            ceiling, departmental boundaries, direct case memberships, and active cryptographic
            share grants.
          </p>
        </div>
      </div>

      {/* 4 Classification Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <ClassificationBadge level={ClassificationLevel.PUBLIC} />
            <span className="text-[10px] font-mono text-muted">Tier 1</span>
          </div>
          <h3 className="text-sm font-bold text-text">PUBLIC</h3>
          <p className="text-xs text-muted">
            Unclassified records, court gazettes, press releases, and citizen notifications.
            Accessible to all system personas.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <ClassificationBadge level={ClassificationLevel.RESTRICTED} />
            <span className="text-[10px] font-mono text-muted">Tier 2 (Default)</span>
          </div>
          <h3 className="text-sm font-bold text-text">RESTRICTED</h3>
          <p className="text-xs text-muted">
            Standard police investigation files, FIRs, seizure memos, and witness statements.
            Accessible to intra-department personnel.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <ClassificationBadge level={ClassificationLevel.CONFIDENTIAL} />
            <span className="text-[10px] font-mono text-muted">Tier 3</span>
          </div>
          <h3 className="text-sm font-bold text-text">CONFIDENTIAL</h3>
          <p className="text-xs text-muted">
            Financial forensics, cyber crime digital extractions, and sensitive witness identities.
            Restricted to assigned investigators & prosecutors.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <ClassificationBadge level={ClassificationLevel.SECRET} />
            <span className="text-[10px] font-mono text-muted">Tier 4 (Highest)</span>
          </div>
          <h3 className="text-sm font-bold text-text">SECRET</h3>
          <p className="text-xs text-muted">
            Surveillance intercepts, undercover intelligence, and state security dossiers. Strictly
            isolated to directly assigned Lead Investigators.
          </p>
        </div>
      </div>

      {/* Interactive ABAC Clearance Simulator */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-base font-bold text-text flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>Interactive ABAC Clearance Simulator</span>
          </h2>
          <p className="text-xs text-muted mt-1">
            Test how the PolicyGuard and PolicyService evaluate clearance requests in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface-alt rounded-xl border border-border">
          {/* Persona Role */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">User Role</label>
            <select
              value={testRole}
              onChange={(e) => setTestRole(e.target.value as UserRole)}
              className="w-full text-xs bg-surface border border-border rounded-lg p-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.values(UserRole).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Classification */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">
              Target Classification
            </label>
            <select
              value={testClassification}
              onChange={(e) => setTestClassification(e.target.value as ClassificationLevel)}
              className="w-full text-xs bg-surface border border-border rounded-lg p-2 text-text focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.values(ClassificationLevel).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Department Match */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Department Match</label>
            <div className="flex items-center space-x-3 mt-2">
              <label className="inline-flex items-center text-xs text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSameDept}
                  onChange={(e) => setIsSameDept(e.target.checked)}
                  className="rounded text-primary focus:ring-primary mr-1.5"
                />
                Same Department
              </label>
            </div>
          </div>

          {/* Direct Assignment & Active Share */}
          <div>
            <label className="block text-xs font-semibold text-text mb-1">Attribute Grants</label>
            <div className="space-y-1.5 mt-1.5">
              <label className="inline-flex items-center text-xs text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={(e) => setIsAssigned(e.target.checked)}
                  className="rounded text-primary focus:ring-primary mr-1.5"
                />
                Assigned Case Member
              </label>
              <br />
              <label className="inline-flex items-center text-xs text-text cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasActiveShare}
                  onChange={(e) => setHasActiveShare(e.target.checked)}
                  className="rounded text-primary focus:ring-primary mr-1.5"
                />
                Has Active ShareGrant
              </label>
            </div>
          </div>
        </div>

        {/* Verdict Box */}
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 ${
            clearanceResult.allowed
              ? 'bg-success/10 border-success/30 text-success'
              : 'bg-danger/10 border-danger/30 text-danger'
          }`}
        >
          {clearanceResult.allowed ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
          )}
          <div>
            <h3 className="text-sm font-bold">
              {clearanceResult.allowed
                ? 'CLEARANCE GRANTED (200 OK)'
                : 'ACCESS FORBIDDEN (403 FORBIDDEN)'}
            </h3>
            <p className="text-xs text-text mt-0.5">{clearanceResult.reason}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
