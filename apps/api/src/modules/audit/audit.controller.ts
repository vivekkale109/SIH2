import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { QueryAuditDto } from './dto/query-audit.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  AuditLedgerEntry,
  AuditVerifyChainResult,
  PaginatedResult,
  UserRole,
} from '@sdms/shared-types';

@ApiTags('Audit Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('verify-chain')
  @Roles(UserRole.AUDITOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Verify the cryptographic integrity of the hash-chained audit ledger',
    description:
      'Validates gapless sequence ordering, hash pointers, and recomputes canonical SHA-256 entry hashes across the entire ledger.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cryptographic ledger chain verification result',
  })
  async verifyChain(): Promise<AuditVerifyChainResult> {
    return this.auditService.verifyChain();
  }

  @Get()
  @Roles(UserRole.AUDITOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'List audit ledger entries with filtering and pagination',
    description:
      'Accessible only by AUDITOR and ADMIN roles. Returns immutable tamper-evident activity records.',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of audit ledger entries',
  })
  async findAll(@Query() query: QueryAuditDto): Promise<PaginatedResult<AuditLedgerEntry>> {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.AUDITOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get a single audit ledger entry by ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit ledger entry details',
  })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<AuditLedgerEntry> {
    return this.auditService.findById(id);
  }
}
