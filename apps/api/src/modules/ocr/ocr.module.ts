import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { AuditModule } from '../audit/audit.module';
import { CasesModule } from '../cases/cases.module';
import { ImagePreprocessingService } from './services/image-preprocessing.service';
import { RuleBasedClassifierService } from './services/rule-based-classifier.service';
import { MetadataExtractorService } from './services/metadata-extractor.service';
import { OcrService } from './services/ocr.service';
import { OcrQueue } from './ocr.queue';
import { OcrProcessor } from './ocr.processor';
import { OcrController } from './ocr.controller';

@Module({
  imports: [PrismaModule, StorageModule, AuditModule, forwardRef(() => CasesModule)],
  controllers: [OcrController],
  providers: [
    ImagePreprocessingService,
    RuleBasedClassifierService,
    MetadataExtractorService,
    OcrService,
    OcrQueue,
    OcrProcessor,
  ],
  exports: [
    ImagePreprocessingService,
    RuleBasedClassifierService,
    MetadataExtractorService,
    OcrService,
    OcrQueue,
    OcrProcessor,
  ],
})
export class OcrModule {}
