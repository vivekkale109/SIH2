import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

export interface WatermarkOptions {
  userEmail: string;
  badgeNumber?: string;
  caseNumber?: string;
  documentTitle?: string;
  classification?: string;
  timestamp?: Date;
}

@Injectable()
export class WatermarkService {
  private readonly logger = new Logger(WatermarkService.name);

  /**
   * Applies dynamic forensic watermarking to a document buffer based on its MIME type.
   * Stamps user email, timestamp, case/document identity, and legal classification.
   */
  async applyWatermark(
    buffer: Buffer,
    mimeType: string,
    options: WatermarkOptions,
  ): Promise<{ buffer: Buffer; mimeType: string }> {
    const timestampStr = (options.timestamp || new Date()).toISOString();
    const caseRef = options.caseNumber ? `CASE: ${options.caseNumber}` : 'SDMS EVIDENCE';
    const classification = options.classification || 'CONFIDENTIAL - RESTRICTED';
    const userRef = options.badgeNumber
      ? `${options.userEmail} [Badge: ${options.badgeNumber}]`
      : options.userEmail;

    try {
      if (mimeType === 'application/pdf') {
        const watermarkedPdf = await this.watermarkPdf(buffer, {
          userRef,
          timestampStr,
          caseRef,
          classification,
        });
        return { buffer: watermarkedPdf, mimeType: 'application/pdf' };
      }

      if (
        mimeType === 'image/jpeg' ||
        mimeType === 'image/png' ||
        mimeType === 'image/webp' ||
        mimeType === 'image/tiff'
      ) {
        const watermarkedImage = await this.watermarkImage(buffer, mimeType, {
          userRef,
          timestampStr,
          caseRef,
          classification,
        });
        return { buffer: watermarkedImage, mimeType };
      }

      if (mimeType === 'text/plain') {
        const watermarkedText = this.watermarkPlainText(buffer, {
          userRef,
          timestampStr,
          caseRef,
          classification,
        });
        return { buffer: watermarkedText, mimeType: 'text/plain' };
      }

      // Return original buffer for unsupported binary formats (e.g. DOCX)
      return { buffer, mimeType };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Watermarking failed for mimeType '${mimeType}': ${msg}. Returning original.`,
      );
      return { buffer, mimeType };
    }
  }

  /**
   * Applies forensic diagonal and header/footer watermarks across all pages of a PDF document.
   */
  private async watermarkPdf(
    buffer: Buffer,
    details: { userRef: string; timestampStr: string; caseRef: string; classification: string },
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (const page of pages) {
      const { width, height } = page.getSize();
      const diagonalText = `SDMS FORENSIC COPY • ${details.userRef} • ${details.caseRef}`;
      const diagonalSubtext = `${details.classification} • ACCESSED: ${details.timestampStr}`;

      // 1. Center diagonal main watermark
      const fontSize = Math.max(14, Math.min(26, Math.floor(width / 32)));
      page.drawText(diagonalText, {
        x: width * 0.15,
        y: height * 0.5,
        size: fontSize,
        font,
        color: rgb(0.8, 0.15, 0.15),
        opacity: 0.32,
        rotate: degrees(35),
      });

      page.drawText(diagonalSubtext, {
        x: width * 0.12,
        y: height * 0.44,
        size: Math.max(10, fontSize - 4),
        font,
        color: rgb(0.6, 0.2, 0.2),
        opacity: 0.28,
        rotate: degrees(35),
      });

      // 2. Top legal forensic banner
      page.drawText(
        `SECURE DIGITAL DOCUMENT MANAGEMENT SYSTEM (SDMS) • ${details.classification}`,
        {
          x: 24,
          y: height - 20,
          size: 7.5,
          font,
          color: rgb(0.4, 0.4, 0.4),
          opacity: 0.65,
        },
      );

      // 3. Bottom forensic tracking line
      page.drawText(
        `FORENSIC TRACE: ${details.userRef} | ${details.timestampStr} | ${details.caseRef} | UNAUTHORIZED DISCLOSURE PROHIBITED`,
        {
          x: 24,
          y: 14,
          size: 7,
          font,
          color: rgb(0.4, 0.4, 0.4),
          opacity: 0.65,
        },
      );
    }

    const savedBytes = await pdfDoc.save();
    return Buffer.from(savedBytes);
  }

  /**
   * Applies SVG watermarking pattern over an image using Sharp.
   */
  private async watermarkImage(
    buffer: Buffer,
    mimeType: string,
    details: { userRef: string; timestampStr: string; caseRef: string; classification: string },
  ): Promise<Buffer> {
    const image = sharp(buffer);
    const meta = await image.metadata();
    const width = meta.width || 1200;
    const height = meta.height || 1600;

    const bannerText = `SDMS FORENSIC COPY • ${details.userRef} • ${details.caseRef} • ${details.timestampStr}`;
    const escapeXml = (str: string): string =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeBanner = escapeXml(bannerText);
    const safeClass = escapeXml(details.classification);

    const svgOverlay = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .diag { font-family: sans-serif; font-size: ${Math.max(18, Math.floor(width / 32))}px; font-weight: bold; fill: rgba(220, 38, 38, 0.35); }
          .subdiag { font-family: sans-serif; font-size: ${Math.max(12, Math.floor(width / 48))}px; font-weight: bold; fill: rgba(185, 28, 28, 0.30); }
          .banner { font-family: sans-serif; font-size: ${Math.max(10, Math.floor(width / 80))}px; font-weight: bold; fill: #475569; }
        </style>
        <!-- Top Banner Bar -->
        <rect x="0" y="0" width="${width}" height="28" fill="rgba(241, 245, 249, 0.85)" />
        <text x="14" y="18" class="banner">${safeClass} • ${safeBanner}</text>

        <!-- Center Diagonal Watermarks -->
        <g transform="translate(${width * 0.15}, ${height * 0.55}) rotate(-35)">
          <text x="0" y="0" class="diag">${safeBanner}</text>
          <text x="0" y="32" class="subdiag">${safeClass} • FOR OFFICIAL LEGAL USE ONLY</text>
        </g>

        <!-- Secondary Diagonal Watermark -->
        <g transform="translate(${width * 0.1}, ${height * 0.25}) rotate(-35)">
          <text x="0" y="0" class="subdiag">${safeBanner}</text>
        </g>
        <g transform="translate(${width * 0.15}, ${height * 0.85}) rotate(-35)">
          <text x="0" y="0" class="subdiag">${safeBanner}</text>
        </g>

        <!-- Bottom Banner Bar -->
        <rect x="0" y="${height - 24}" width="${width}" height="24" fill="rgba(241, 245, 249, 0.85)" />
        <text x="14" y="${height - 8}" class="banner">UNAUTHORIZED REPRODUCTION OR DISTRIBUTION STRICTLY PROHIBITED • ${safeBanner}</text>
      </svg>
    `;

    let pipeline = image.composite([
      {
        input: Buffer.from(svgOverlay),
        top: 0,
        left: 0,
      },
    ]);

    if (mimeType === 'image/jpeg') {
      pipeline = pipeline.jpeg({ quality: 90 });
    } else if (mimeType === 'image/png') {
      pipeline = pipeline.png();
    } else if (mimeType === 'image/webp') {
      pipeline = pipeline.webp({ quality: 90 });
    }

    return pipeline.toBuffer();
  }

  /**
   * Prepend and append forensic header/footer to plain text content.
   */
  private watermarkPlainText(
    buffer: Buffer,
    details: { userRef: string; timestampStr: string; caseRef: string; classification: string },
  ): Buffer {
    const originalText = buffer.toString('utf-8');
    const header = [
      '================================================================================',
      `  SDMS SECURE DIGITAL DOCUMENT MANAGEMENT SYSTEM - FORENSIC ACCESS RECORD`,
      `  CLASSIFICATION: ${details.classification}`,
      `  ACCESSED BY:    ${details.userRef}`,
      `  TIMESTAMP:      ${details.timestampStr}`,
      `  REFERENCE:      ${details.caseRef}`,
      '================================================================================',
      '',
    ].join('\n');

    const footer = [
      '',
      '================================================================================',
      `  END OF RECORD - RESTRICTED DISTRIBUTION - AUDIT LOGGED IN IMMUTABLE LEDGER`,
      '================================================================================',
    ].join('\n');

    return Buffer.from(`${header}${originalText}${footer}`, 'utf-8');
  }
}
