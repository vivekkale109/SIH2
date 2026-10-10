'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Building2,
  Search,
  Filter,
  Shield,
  Users,
  Briefcase,
  CheckCircle2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { DepartmentSummary, DepartmentType } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

interface DepartmentItem extends DepartmentSummary {
  userCount?: number;
}

const DEMO_FALLBACK_DEPARTMENTS: DepartmentItem[] = [
  {
    id: 'dept-police-1',
    name: 'Cyber Crime Police Station (Central)',
    code: 'POL-CCB',
    type: DepartmentType.POLICE,
    jurisdiction: 'State Central Cyber Division',
    createdAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    userCount: 8,
  },
  {
    id: 'dept-police-2',
    name: 'Economic Offences Wing (EOW)',
    code: 'POL-EOW',
    type: DepartmentType.POLICE,
    jurisdiction: 'Financial Crimes & Asset Forfeiture',
    createdAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    userCount: 6,
  },
  {
    id: 'dept-pros-1',
    name: 'Directorate of Public Prosecutions',
    code: 'PROS-HQ',
    type: DepartmentType.PROSECUTION,
    jurisdiction: 'State Sessions & High Court Prosecution',
    createdAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    userCount: 4,
  },
  {
    id: 'dept-court-1',
    name: 'Principal City Sessions Court (Special Court)',
    code: 'CRT-SESS-01',
    type: DepartmentType.COURT,
    jurisdiction: 'Sessions & Special Acts Trial Division',
    createdAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24 * 90).toISOString(),
    userCount: 5,
  },
];

export default function DepartmentsPage() {
  const { token } = useAuth();
  const [departments, setDepartments] = useState<DepartmentItem[]>(DEMO_FALLBACK_DEPARTMENTS);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      if (token) {
        const res = await fetch('/api/v1/departments', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setDepartments(data);
            setLoading(false);
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
    setDepartments(DEMO_FALLBACK_DEPARTMENTS);
    setLoading(false);
  }, [token]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const filtered = departments.filter((d) => {
    if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;
    if (
      search &&
      !d.name.toLowerCase().includes(search.toLowerCase()) &&
      !d.code.toLowerCase().includes(search.toLowerCase()) &&
      !(d.jurisdiction || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getTypeBadge = (type: DepartmentType) => {
    switch (type) {
      case DepartmentType.POLICE:
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      case DepartmentType.PROSECUTION:
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case DepartmentType.COURT:
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      default:
        return 'bg-surface-alt text-muted border-border';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/15 text-primary font-mono uppercase">
              Administrative Units
            </span>
            <span className="text-xs text-muted">• Organizational Isolation</span>
          </div>
          <h1 className="text-2xl font-bold text-text mt-2 flex items-center space-x-2.5">
            <Building2 className="h-7 w-7 text-primary" />
            <span>Government Departments & Jurisdictional Units</span>
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Departmental boundaries strictly isolate investigation dossiers and case records.
            Cross-department access requires explicit time-limited cryptographic share grants.
          </p>
        </div>

        <button
          onClick={fetchDepartments}
          disabled={loading}
          className="inline-flex items-center space-x-2 bg-surface hover:bg-surface-alt border border-border text-text text-xs font-semibold px-3 py-2 rounded-lg transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border p-3 rounded-xl shadow-sm">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search departments by name, code, or jurisdiction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-surface-alt border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
          <span className="text-xs text-muted">Type:</span>
          {['ALL', 'POLICE', 'PROSECUTION', 'COURT'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-primary text-white'
                  : 'bg-surface-alt text-muted hover:text-text border border-border'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((dept) => (
          <div
            key={dept.id}
            className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border uppercase mb-1.5 ${getTypeBadge(
                    dept.type,
                  )}`}
                >
                  {dept.type}
                </span>
                <h3 className="text-sm font-bold text-text">{dept.name}</h3>
              </div>
              <span className="font-mono text-xs font-bold px-2 py-1 bg-surface-alt border border-border rounded text-text">
                {dept.code}
              </span>
            </div>

            <p className="text-xs text-muted">
              Jurisdiction:{' '}
              <span className="text-text font-medium">
                {dept.jurisdiction || 'Statewide Jurisdiction'}
              </span>
            </p>

            <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted">
              <span className="flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-primary" />
                <span>{dept.userCount || '—'} Active Officers</span>
              </span>
              <span className="text-[11px] font-mono">
                Est: {new Date(dept.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
