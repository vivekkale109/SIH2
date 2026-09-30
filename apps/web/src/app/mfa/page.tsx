'use client';

import React, { useState } from 'react';
import { ShieldCheck, QrCode, Key, CheckCircle, Copy, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function MfaPage() {
  const { user, token, refreshUser } = useAuth();
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const handleGenerateMfa = async (): Promise<void> => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/mfa/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to generate MFA setup code');
      }

      const data = await res.json();
      setQrCodeDataUrl(data.qrCodeDataUrl);
      setSecret(data.secret);
    } catch (err: unknown) {
      // Demo fallback if backend is unreachable
      setQrCodeDataUrl(
        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="%23eee"/><text x="20" y="100" fill="%23333">Demo QR Code</text></svg>',
      );
      setSecret('JBSWY3DPEHPK3PXP');
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error generating MFA. Showing demo secret.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableMfa = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!secret || !verificationCode) return;

    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/mfa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          secret,
          code: verificationCode,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Invalid verification code' }));
        throw new Error(errorData.message || 'MFA validation failed');
      }

      setStatusMessage({
        type: 'success',
        text: 'Multi-Factor Authentication (TOTP) has been successfully activated for your account.',
      });
      await refreshUser();
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Invalid 6-digit code. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = (): void => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <Link
          href="/"
          className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-alt transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-text">Two-Factor Authentication (TOTP)</h1>
          <p className="text-xs text-muted">
            Protect evidence handling and case data with hardware/software token authentication
          </p>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-lg border text-xs flex items-start space-x-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-success/10 border-success/20 text-success'
              : 'bg-danger/10 border-danger/20 text-danger'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* MFA Current Status Card */}
      <div className="bg-surface border border-border rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-primary/10 rounded-lg text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">Current Status</p>
              <p className="text-xs text-muted">User: {user?.email}</p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              user?.mfaEnabled ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
            }`}
          >
            {user?.mfaEnabled ? 'Active (Protected)' : 'Not Enabled'}
          </span>
        </div>

        {!secret && !user?.mfaEnabled && (
          <div className="pt-3 border-t border-border">
            <button
              onClick={handleGenerateMfa}
              disabled={isLoading}
              className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              <span>{isLoading ? 'Generating Keys...' : 'Setup Authenticator App'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Setup Step Card */}
      {secret && (
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-text">Step 1: Scan QR Code</h2>
            <p className="text-xs text-muted">
              Scan this code using Google Authenticator, Microsoft Authenticator, or Aegis.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-surface-alt rounded-lg border border-border">
            {qrCodeDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeDataUrl}
                alt="MFA QR Code"
                className="w-44 h-44 rounded-lg border border-border bg-white p-2"
              />
            ) : (
              <div className="w-44 h-44 bg-border/40 rounded-lg flex items-center justify-center text-xs text-muted">
                Generating...
              </div>
            )}

            <div className="space-y-3 flex-1">
              <div>
                <p className="text-xs font-semibold text-text">Manual Setup Key</p>
                <p className="text-[11px] text-muted">If you cannot scan the QR code:</p>
              </div>

              <div className="flex items-center space-x-2">
                <code className="bg-surface border border-border px-3 py-1.5 rounded-lg text-xs font-mono text-primary font-bold tracking-wider">
                  {secret}
                </code>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="p-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
                  title="Copy secret"
                >
                  <Copy className="w-4 h-4 text-muted" />
                </button>
                {isCopied && <span className="text-[10px] text-success">Copied!</span>}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-text">Step 2: Enter 6-Digit Code</h2>
              <p className="text-xs text-muted">
                Confirm your configuration by entering the current code shown in your app.
              </p>
            </div>

            <form onSubmit={handleEnableMfa} className="space-y-4">
              <div className="max-w-xs">
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-surface-alt border border-border rounded-lg pl-9 pr-4 py-2 text-sm font-mono tracking-widest text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || verificationCode.length !== 6}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Verifying...' : 'Activate MFA Protection'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
