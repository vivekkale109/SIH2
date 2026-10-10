import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CasesModule } from '../cases/cases.module';
import { AuditModule } from '../audit/audit.module';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';

@Module({
  imports: [PrismaModule, CasesModule, AuditModule],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
