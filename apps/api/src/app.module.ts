import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { AuditModule } from './modules/audit/audit.module';
import { CasesModule } from './modules/cases/cases.module';
import { StorageModule } from './modules/storage/storage.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { SearchModule } from './modules/search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env', '../../.env'],
    }),
    PrismaModule,
    HealthModule,
    AuditModule,
    AuthModule,
    UsersModule,
    DepartmentsModule,
    CasesModule,
    StorageModule,
    DocumentsModule,
    OcrModule,
    SearchModule,
  ],
})
export class AppModule {}
