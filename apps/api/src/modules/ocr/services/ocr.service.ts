import { Injectable, Logger } from '@nestjs/common';
import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import { ImagePreprocessingService } from './image-preprocessing.service';
import { RuleBasedClassifierService } from './rule-based-classifier.service';
import { MetadataExtractorService, ExtractedMetadata } from './metadata-extractor.service';
import { ClassificationResult } from '../interfaces/classifier.interface';

export interface ProcessedOcrResult {
  extractedText: string;
  confidence: number;
  classification: ClassificationResult;
  metadata: ExtractedMetadata;
}

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly preprocessingService: ImagePreprocessingService,
    private readonly classifierService: RuleBasedClassifierService,
    private readonly metadataExtractor: MetadataExtractorService,
  ) {}

  /**
   * Process document file buffer through OCR, rule-based classification, and metadata extraction.
   */
  async processDocumentBuffer(buffer: Buffer, mimeType: string): Promise<ProcessedOcrResult> {
    let extractedText = '';
    let confidence = 0.5;

    try {
      if (mimeType === 'application/pdf') {
        const pdfData = await this.extractPdfText(buffer);
        extractedText = pdfData.text;
        confidence = pdfData.confidence;
      } else if (
        mimeType.startsWith('image/') ||
        ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'].includes(mimeType)
      ) {
        const imgData = await this.extractImageText(buffer);
        extractedText = imgData.text;
        confidence = imgData.confidence;
      } else {
        // Plain text or fallback
        extractedText = buffer.toString('utf-8');
        confidence = 0.9;
      }
    } catch (err) {
      this.logger.error(`Failed to extract text from document: ${(err as Error).message}`, err);
      throw err;
    }

    // Clean up OCR extracted text
    const normalizedText = this.normalizeExtractedText(extractedText);

    // Rule-based classification
    const classification = this.classifierService.classify(normalizedText);

    // Metadata extraction
    const metadata = this.metadataExtractor.extract(normalizedText);

    return {
      extractedText: normalizedText,
      confidence: Math.round(confidence * 100) / 100,
      classification,
      metadata,
    };
  }

  private async extractPdfText(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      const data = await pdfParse(buffer);
      const text = data.text ? data.text.trim() : '';

      if (text.length > 50) {
        // High quality native PDF text found
        const printableRatio = this.calculatePrintableRatio(text);
        const confidence = Math.min(0.99, Math.max(0.75, printableRatio));
        return { text, confidence };
      }

      // If PDF has very little text (e.g., scanned PDF without text layer)
      return {
        text: text || '[Scanned PDF with low native text layer]',
        confidence: 0.5,
      };
    } catch (err) {
      this.logger.warn(`pdf-parse error: ${(err as Error).message}`);
      return { text: '', confidence: 0 };
    }
  }

  private async extractImageText(buffer: Buffer): Promise<{ text: string; confidence: number }> {
    try {
      // 1. Preprocess image with sharp (grayscale, normalize, sharpen, upscale)
      const preprocessed = await this.preprocessingService.preprocessImage(buffer);

      // 2. Perform OCR recognition with Tesseract
      const result = await Tesseract.recognize(preprocessed, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            this.logger.debug(`Tesseract progress: ${Math.round((m.progress || 0) * 100)}%`);
          }
        },
      });

      const text = result.data.text ? result.data.text.trim() : '';
      const confidence = (result.data.confidence || 50) / 100; // Tesseract reports 0-100

      return {
        text,
        confidence: Math.min(1.0, Math.max(0.1, confidence)),
      };
    } catch (err) {
      this.logger.error(`Tesseract OCR execution error: ${(err as Error).message}`, err);
      throw err;
    }
  }

  private calculatePrintableRatio(text: string): number {
    if (!text || text.length === 0) return 0;
    let printable = 0;
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if ((code >= 32 && code <= 126) || code === 10 || code === 13) {
        printable++;
      }
    }
    return printable / text.length;
  }

  private normalizeExtractedText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
