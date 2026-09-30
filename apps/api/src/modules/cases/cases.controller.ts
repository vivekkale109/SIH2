import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PolicyGuard } from './policy/policy.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePolicy } from './policy/require-policy.decorator';
import { PolicyAction } from './policy/policy.types';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';
import { AddCaseMemberDto } from './dto/add-case-member.dto';
import { QueryCaseDto } from './dto/query-case.dto';
import {
  CaseSummary,
  CaseDetailSummary,
  PaginatedResult,
  AuditLedgerEntry,
  UserRole,
} from '@sdms/shared-types';

@ApiTags('Cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PolicyGuard)
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.INVESTIGATOR)
  @ApiOperation({
    summary: 'Create a new investigation case',
    description:
      'Creates a new case and assigns the creator as the Lead Investigator. Emits a hash-chained audit record.',
  })
  @ApiResponse({ status: 201, description: 'Case created successfully' })
  @ApiResponse({ status: 409, description: 'Case number already exists' })
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    return this.casesService.create(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List cases with ABAC-filtered visibility and pagination',
    description:
      'Returns cases accessible to the authenticated user based on role, department, assignment, and classification.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of accessible cases' })
  async findAll(
    @Query() query: QueryCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedResult<CaseSummary>> {
    return this.casesService.findAll(query, user);
  }

  @Get(':id')
  @RequirePolicy(PolicyAction.VIEW_CASE)
  @ApiOperation({
    summary: 'Get case details by ID',
    description:
      'Evaluates ABAC policies (clearance, assignment, department) and returns full case details including members.',
  })
  @ApiResponse({ status: 200, description: 'Case details retrieved' })
  @ApiResponse({
    status: 403,
    description: 'ABAC Access Denied: User lacks clearance or assignment',
  })
  @ApiResponse({ status: 404, description: 'Case not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    return this.casesService.findById(id, user);
  }

  @Patch(':id')
  @RequirePolicy(PolicyAction.MODIFY_CASE)
  @ApiOperation({
    summary: 'Update case metadata (title, description, classification)',
  })
  @ApiResponse({ status: 200, description: 'Case updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires Lead Investigator or Admin' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    return this.casesService.update(id, dto, user);
  }

  @Patch(':id/status')
  @RequirePolicy(PolicyAction.TRANSITION_STATUS)
  @ApiOperation({
    summary: 'Transition case lifecycle status',
    description:
      'Enforces legal lifecycle transitions (OPEN -> UNDER_REVIEW -> CLOSED -> ARCHIVED) with role permissions.',
  })
  @ApiResponse({ status: 200, description: 'Case status transitioned' })
  @ApiResponse({ status: 403, description: 'Forbidden: unauthorized state transition' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    return this.casesService.updateStatus(id, dto, user);
  }

  @Post(':id/members')
  @RequirePolicy(PolicyAction.MANAGE_MEMBERS)
  @ApiOperation({
    summary: 'Assign a user to the case with a case-level role',
  })
  @ApiResponse({ status: 200, description: 'Member assigned successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires Lead Investigator or Admin' })
  async addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCaseMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    return this.casesService.addMember(id, dto, user);
  }

  @Delete(':id/members/:userId')
  @RequirePolicy(PolicyAction.MANAGE_MEMBERS)
  @ApiOperation({
    summary: 'Remove a member from the case',
  })
  @ApiResponse({ status: 200, description: 'Member removed from case' })
  @ApiResponse({ status: 403, description: 'Forbidden: requires Lead Investigator or Admin' })
  async removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CaseDetailSummary> {
    return this.casesService.removeMember(id, userId, user);
  }

  @Get(':id/timeline')
  @RequirePolicy(PolicyAction.VIEW_CASE)
  @ApiOperation({
    summary: 'Get chronological activity timeline of the case from the audit ledger',
  })
  @ApiResponse({ status: 200, description: 'Case activity timeline' })
  async getTimeline(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AuditLedgerEntry[]> {
    return this.casesService.getTimeline(id, user);
  }
}
