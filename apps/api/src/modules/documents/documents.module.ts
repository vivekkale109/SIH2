import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { CasesModule } from '../cases/cases.module';
import { OcrModule } from '../ocr/ocr.module';
import { DocumentsService } from './documents.service';
import { DocumentsController, CaseDocumentsController } from './documents.controller';

@Module({
  imports: [PrismaModule, AuditModule, StorageModule, CasesModule, OcrModule],
  controllers: [DocumentsController, CaseDocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
