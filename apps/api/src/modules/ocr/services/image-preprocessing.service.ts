import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';

export interface PreprocessingOptions {
  grayscale?: boolean;
  normalize?: boolean;
  sharpen?: boolean;
  threshold?: number;
  minWidth?: number;
}

@Injectable()
export class ImagePreprocessingService {
  private readonly logger = new Logger(ImagePreprocessingService.name);

  /**
   * Preprocesses image buffer for optimal Tesseract OCR accuracy:
   * 1. Auto-orient (deskew/rotate based on EXIF)
   * 2. Convert to grayscale
   * 3. Normalize contrast / dynamic range stretch
   * 4. Sharpen high frequency edges
   * 5. Optional thresholding/binarization
   */
  async preprocessImage(buffer: Buffer, options: PreprocessingOptions = {}): Promise<Buffer> {
    try {
      const {
        grayscale = true,
        normalize = true,
        sharpen = true,
        threshold,
        minWidth = 1600,
      } = options;

      let pipeline = sharp(buffer, { failOn: 'none' }).rotate(); // Auto-rotate via EXIF

      const metadata = await pipeline.metadata();

      // Upscale low-resolution images for higher OCR recognition rates
      if (metadata.width && metadata.width < minWidth) {
        pipeline = pipeline.resize({
          width: minWidth,
          withoutEnlargement: false,
          fit: 'inside',
        });
      }

      if (grayscale) {
        pipeline = pipeline.grayscale();
      }

      if (normalize) {
        pipeline = pipeline.normalize();
      }

      if (sharpen) {
        pipeline = pipeline.sharpen({
          sigma: 1.2,
          m1: 1.5,
          m2: 0.7,
        });
      }

      if (typeof threshold === 'number' && threshold >= 0 && threshold <= 255) {
        pipeline = pipeline.threshold(threshold);
      }

      // Output as uncompressed PNG for high clarity OCR input
      const preprocessed = await pipeline.png().toBuffer();
      this.logger.debug(
        `Preprocessed image: original size ${buffer.length}b -> ${preprocessed.length}b`,
      );
      return preprocessed;
    } catch (err) {
      this.logger.warn(
        `Image preprocessing fallback to original buffer: ${(err as Error).message}`,
      );
      return buffer;
    }
  }
}
