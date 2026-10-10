import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CasesModule } from '../cases/cases.module';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';
import { WatermarkService } from './services/watermark.service';

@Module({
  imports: [PrismaModule, AuditModule, CasesModule],
  controllers: [SharingController],
  providers: [SharingService, WatermarkService],
  exports: [SharingService, WatermarkService],
})
export class SharingModule {}
