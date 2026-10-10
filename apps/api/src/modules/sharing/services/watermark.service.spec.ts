import { Test, TestingModule } from '@nestjs/testing';
import { WatermarkService } from './watermark.service';
import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';

describe('WatermarkService', () => {
  let service: WatermarkService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WatermarkService],
    }).compile();

    service = module.get<WatermarkService>(WatermarkService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('PDF Watermarking', () => {
    it('should stamp dynamic diagonal watermark and forensic headers on a PDF', async () => {
      // Create a minimal test PDF using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      page.drawText('Original Evidence Content');
      const originalBytes = Buffer.from(await pdfDoc.save());

      const res = await service.applyWatermark(originalBytes, 'application/pdf', {
        userEmail: 'investigator@police.gov.in',
        badgeNumber: 'POL-9021',
        caseNumber: 'FIR-2026-440',
        documentTitle: 'Forensic Lab Report',
        classification: 'SECRET',
      });

      expect(res.mimeType).toBe('application/pdf');
      expect(res.buffer).toBeInstanceOf(Buffer);
      expect(res.buffer.length).toBeGreaterThan(originalBytes.length);

      // Verify the watermarked PDF can be parsed and has pages
      const parsed = await PDFDocument.load(res.buffer);
      expect(parsed.getPageCount()).toBe(1);
    });
  });

  describe('Image Watermarking', () => {
    it('should composite forensic SVG overlay onto a PNG image', async () => {
      // Create a minimal 200x200 PNG image
      const originalImage = await sharp({
        create: {
          width: 200,
          height: 200,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const res = await service.applyWatermark(originalImage, 'image/png', {
        userEmail: 'court.officer@court.gov.in',
        caseNumber: 'CASE-771',
        classification: 'RESTRICTED',
      });

      expect(res.mimeType).toBe('image/png');
      expect(res.buffer).toBeInstanceOf(Buffer);

      // Verify that sharp can parse the watermarked result
      const meta = await sharp(res.buffer).metadata();
      expect(meta.width).toBe(200);
      expect(meta.height).toBe(200);
      expect(meta.format).toBe('png');
    });

    it('should composite forensic overlay onto a JPEG image', async () => {
      const originalImage = await sharp({
        create: {
          width: 150,
          height: 150,
          channels: 3,
          background: { r: 240, g: 240, b: 240 },
        },
      })
        .jpeg()
        .toBuffer();

      const res = await service.applyWatermark(originalImage, 'image/jpeg', {
        userEmail: 'prosecutor@state.gov.in',
        caseNumber: 'CRIM-882',
      });

      expect(res.mimeType).toBe('image/jpeg');
      expect(res.buffer).toBeInstanceOf(Buffer);
      const meta = await sharp(res.buffer).metadata();
      expect(meta.width).toBe(150);
      expect(meta.format).toBe('jpeg');
    });
  });

  describe('Text and Fallback Watermarking', () => {
    it('should prepend and append forensic banners to plain text', async () => {
      const originalText = Buffer.from('Confidential Witness Statement transcript');
      const res = await service.applyWatermark(originalText, 'text/plain', {
        userEmail: 'investigator@police.gov.in',
        badgeNumber: 'B-101',
        caseNumber: 'FIR-2026-90',
        classification: 'CONFIDENTIAL',
      });

      expect(res.mimeType).toBe('text/plain');
      const text = res.buffer.toString('utf-8');
      expect(text).toContain('FORENSIC ACCESS RECORD');
      expect(text).toContain('investigator@police.gov.in');
      expect(text).toContain('B-101');
      expect(text).toContain('FIR-2026-90');
      expect(text).toContain('CONFIDENTIAL');
      expect(text).toContain('Confidential Witness Statement transcript');
    });

    it('should return original buffer for unsupported binary formats gracefully', async () => {
      const rawData = Buffer.from([0x00, 0x01, 0x02, 0x03]);
      const res = await service.applyWatermark(
        rawData,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        {
          userEmail: 'user@gov.in',
        },
      );

      expect(res.buffer).toEqual(rawData);
    });
  });
});
