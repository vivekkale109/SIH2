'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Download,
  FileText,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import { ShareScope } from '@sdms/shared-types';
import { useAuth } from '@/context/AuthContext';

interface WatermarkPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  documentTitle?: string;
  mimeType?: string;
  scope?: ShareScope;
  caseNumber?: string;
}

export const WatermarkPreviewModal: React.FC<WatermarkPreviewModalProps> = ({
  isOpen,
  onClose,
  documentId,
  documentTitle = 'Evidence Document',
  mimeType = 'application/pdf',
  scope = ShareScope.VIEW_ONLY,
  caseNumber,
}) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !documentId) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      setTextContent(null);
      setErrorMsg(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMsg(null);

    const fetchWatermarkedStream = async () => {
      try {
        const res = await fetch(`/api/v1/documents/${documentId}/preview`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ message: 'Preview failed' }));
          throw new Error(err.message || `Failed to fetch preview (${res.status})`);
        }

        const contentType = res.headers.get('Content-Type') || mimeType;

        if (contentType.includes('text/plain')) {
          const text = await res.text();
          if (isMounted) {
            setTextContent(text);
            setLoading(false);
          }
        } else {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          if (isMounted) {
            setBlobUrl(url);
            setLoading(false);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Error loading watermarked document');
          setLoading(false);
        }
      }
    };

    fetchWatermarkedStream();

    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, documentId, token, mimeType]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/v1/documents/${documentId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Download blocked' }));
        alert(err.message || 'Download forbidden under active scope restriction.');
        return;
      }
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      let filename = `${documentTitle}.pdf`;
      if (disposition && disposition.includes('filename=')) {
        filename = decodeURIComponent(disposition.split('filename=')[1].replace(/['"]/g, ''));
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Network error while requesting download');
    }
  };

  const isPdf =
    mimeType.includes('pdf') || (!mimeType.includes('image') && !mimeType.includes('text'));
  const isImage = mimeType.includes('image');
  const isText = mimeType.includes('text');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-border flex items-center justify-between bg-surface-alt">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text truncate max-w-md">{documentTitle}</h2>
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
                  WATERMARKED
                </span>
                {caseNumber && (
                  <span className="text-[10px] font-mono text-muted">Case: {caseNumber}</span>
                )}
              </div>
              <p className="text-[11px] text-muted">
                Dynamic forensic watermark applied • Viewer: {user?.email} • Badge:{' '}
                {user?.badgeNumber || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scope === ShareScope.DOWNLOAD && (
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Download Watermarked
              </button>
            )}

            {scope === ShareScope.VIEW_ONLY && (
              <span className="text-[10px] font-semibold text-muted bg-surface border border-border px-2.5 py-1 rounded flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-500" />
                View Only (Downloads Restricted)
              </span>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border/40 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Watermark Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2 flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Cryptographic Traceability Active:</strong> Stamped with recipient email (
              {user?.email}), timestamp ({new Date().toISOString()}), and case reference.
            </span>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider font-semibold opacity-75">
            BSA 2023 §61-63 Compliant
          </span>
        </div>

        {/* Document Viewer Body */}
        <div className="flex-1 bg-surface-alt/40 p-4 overflow-hidden flex items-center justify-center relative">
          {loading && (
            <div className="flex flex-col items-center justify-center space-y-2 text-muted text-xs">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span>Applying forensic watermark and streaming document...</span>
            </div>
          )}

          {errorMsg && (
            <div className="max-w-md p-6 bg-surface border border-rose-500/30 rounded-2xl text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <h3 className="text-sm font-bold text-text">Preview Unavailable</h3>
              <p className="text-xs text-muted">{errorMsg}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-surface-alt border border-border rounded-lg text-xs font-semibold text-text hover:bg-border/30 transition"
              >
                Close Viewer
              </button>
            </div>
          )}

          {!loading && !errorMsg && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              title={documentTitle}
              className="w-full h-full rounded-xl border border-border shadow-inner bg-white"
            />
          )}

          {!loading && !errorMsg && blobUrl && isImage && (
            <div className="max-h-full max-w-full overflow-auto flex items-center justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blobUrl}
                alt={documentTitle}
                className="max-h-[75vh] max-w-full rounded-lg border border-border shadow-md object-contain bg-white"
              />
            </div>
          )}

          {!loading && !errorMsg && textContent && isText && (
            <div className="w-full h-full overflow-y-auto bg-surface border border-border rounded-xl p-6 font-mono text-xs text-text whitespace-pre-wrap leading-relaxed shadow-inner">
              {textContent}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
