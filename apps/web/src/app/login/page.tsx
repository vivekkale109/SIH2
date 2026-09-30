'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Lock, Mail, KeyRound, AlertTriangle, ArrowRight, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@sdms/shared-types';

export default function LoginPage() {
  const router = useRouter();
  const { login, switchDemoUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isMfaRequired, setIsMfaRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const demoAccounts = [
    { role: UserRole.ADMIN, email: 'admin@sdms.gov.in', title: 'System Admin' },
    {
      role: UserRole.INVESTIGATOR,
      email: 'investigator@police.gov.in',
      title: 'Police Investigator',
    },
    {
      role: UserRole.PROSECUTOR,
      email: 'prosecutor@prosecution.gov.in',
      title: 'Public Prosecutor',
    },
    { role: UserRole.COURT_OFFICER, email: 'court.officer@court.gov.in', title: 'Court Registrar' },
    { role: UserRole.RECORDS_MANAGER, email: 'records@sdms.gov.in', title: 'Records Officer' },
    { role: UserRole.AUDITOR, email: 'auditor@vigilance.gov.in', title: 'Vigilance Auditor' },
  ];

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await login(email, password, mfaCode || undefined);
      if (res.mfaRequired) {
        setIsMfaRequired(true);
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Authentication failed. Please verify credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, role: UserRole): void => {
    setEmail(demoEmail);
    setPassword('Secure#Demo2026!');
    setMfaCode('');
    setIsMfaRequired(false);
    setErrorMessage(null);
    switchDemoUser(role);
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl text-primary mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text">Secure Evidence Portal</h1>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Authorized Personnel Only · Protected under BSA 2023 & IT Act 2000 · All sessions are
            hash-logged
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-5">
          {errorMessage && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-lg flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@police.gov.in"
                  className="w-full bg-surface-alt border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-surface-alt border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {isMfaRequired && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <label className="block text-xs font-semibold text-primary">
                  TOTP Authenticator 6-Digit Code
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full bg-surface border border-primary/30 rounded-lg pl-9 pr-4 py-2 text-sm font-mono tracking-widest text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-muted">
                  Open your Google Authenticator or hardware token app.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded-lg text-sm flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
            >
              <span>
                {isLoading
                  ? 'Verifying Credentials...'
                  : isMfaRequired
                    ? 'Verify MFA & Enter'
                    : 'Sign In'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Logins for Hackathon Evaluators */}
          <div className="pt-4 border-t border-border space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-muted">
              <UserCheck className="w-3.5 h-3.5 text-primary" />
              <span>SIH Demo Persona Quick-Fill:</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleQuickFill(acc.email, acc.role)}
                  className="p-2 text-left bg-surface-alt hover:bg-border/60 border border-border rounded-lg text-xs transition-colors"
                >
                  <p className="font-semibold text-text truncate">{acc.title}</p>
                  <p className="text-[10px] text-muted truncate">{acc.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Security Notice Footer */}
        <p className="text-center text-[11px] text-muted">
          Protected by Argon2id password hashing · 5-attempt rate-limiting lockout · JWT + Rotating
          Refresh Tokens
        </p>
      </div>
    </div>
  );
}
