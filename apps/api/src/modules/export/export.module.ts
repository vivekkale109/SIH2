import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { CasesModule } from '../cases/cases.module';
import { AuthModule } from '../auth/auth.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { SignerService } from './services/signer.service';
import { CertificateService } from './services/certificate.service';

@Module({
  imports: [ConfigModule, PrismaModule, AuditModule, StorageModule, CasesModule, AuthModule],
  controllers: [ExportController],
  providers: [ExportService, SignerService, CertificateService],
  exports: [ExportService, SignerService, CertificateService],
})
export class ExportModule {}
