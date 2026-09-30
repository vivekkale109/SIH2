import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { PolicyService } from './policy/policy.service';
import { PolicyGuard } from './policy/policy.guard';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CasesController],
  providers: [CasesService, PolicyService, PolicyGuard],
  exports: [CasesService, PolicyService, PolicyGuard],
})
export class CasesModule {}
