import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { SharingService } from './sharing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateShareDto } from './dto/create-share.dto';
import { QuerySharesDto } from './dto/query-shares.dto';
import { ShareGrantDetailSummary } from '@sdms/shared-types';

@ApiTags('Sharing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shares')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a scoped, time-limited share grant',
    description:
      'Grants VIEW_ONLY or DOWNLOAD access to a case or document for a specific user or department. Requires re-authentication and logs SHARE_CREATED in the audit ledger.',
  })
  @ApiResponse({ status: 201, description: 'Share grant created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid parameters or expiration date in past' })
  @ApiResponse({
    status: 403,
    description: 'Re-authentication failed or unauthorized to share resource',
  })
  @ApiResponse({ status: 404, description: 'Target user, department, or resource not found' })
  async createShare(
    @Body() dto: CreateShareDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShareGrantDetailSummary> {
    return this.sharingService.createShare(dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List and filter share grants',
    description:
      'Lists share grants sent by or received by the current user or their department. Supports filtering by direction, resource, and active status.',
  })
  @ApiResponse({ status: 200, description: 'Filtered share grants retrieved' })
  async getShares(
    @Query() query: QuerySharesDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShareGrantDetailSummary[]> {
    return this.sharingService.getShares(query, user);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get details of a specific share grant by ID',
  })
  @ApiParam({ name: 'id', description: 'UUID of the share grant' })
  @ApiResponse({ status: 200, description: 'Share grant details' })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied' })
  @ApiResponse({ status: 404, description: 'Share grant not found' })
  async getShareById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShareGrantDetailSummary> {
    return this.sharingService.getShareById(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke an active share grant',
    description:
      'Immediately cuts off access to the shared resource and records SHARE_REVOKED in the immutable ledger.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the share grant to revoke' })
  @ApiResponse({ status: 200, description: 'Share grant revoked successfully' })
  @ApiResponse({ status: 403, description: 'Unauthorized to revoke this share grant' })
  @ApiResponse({ status: 404, description: 'Share grant not found' })
  async revokeShare(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.sharingService.revokeShare(id, user);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Alternative POST endpoint to revoke an active share grant',
  })
  async revokeSharePost(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.sharingService.revokeShare(id, user);
  }

  @Get(':id/access')
  @ApiOperation({
    summary: 'Access and inspect a shared resource',
    description:
      'Performs real-time expiration and revocation validation. Returns 403 immediately if expired or revoked. Logs SHARE_ACCESSED in the audit ledger.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the share grant' })
  @ApiResponse({ status: 200, description: 'Shared resource accessed successfully' })
  @ApiResponse({
    status: 403,
    description: 'Share grant expired, revoked, or unauthorized grantee',
  })
  @ApiResponse({ status: 404, description: 'Share grant or shared resource not found' })
  async accessSharedResource(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{
    share: ShareGrantDetailSummary;
    resource: Record<string, unknown>;
  }> {
    return this.sharingService.accessSharedResource(id, user);
  }
}
