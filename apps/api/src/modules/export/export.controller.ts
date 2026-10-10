import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
  StreamableFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateExportDto } from './dto/create-export.dto';
import { ExportPackageSummary, PackageVerificationResult } from '@sdms/shared-types';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('cases/:caseId/exports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a court-ready, Ed25519 digitally signed evidence export package',
    description:
      'Compiles attached evidence files, computes SHA-256 digests, generates a BSA 2023 §61–63 electronic certificate, builds manifest.json, digitally signs with Ed25519, packs as ZIP, and logs EXPORT_CREATED in the audit ledger.',
  })
  @ApiParam({ name: 'caseId', description: 'UUID of the case to export' })
  @ApiResponse({ status: 201, description: 'Export package created and signed successfully' })
  @ApiResponse({ status: 400, description: 'No documents attached or integrity check failed' })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied or Re-authentication failed' })
  async createExport(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @Body() dto: CreateExportDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExportPackageSummary> {
    return this.exportService.createExport(caseId, dto, user);
  }

  @Get('cases/:caseId/exports')
  @ApiOperation({
    summary: 'List all verifiable export packages generated for a case',
  })
  @ApiParam({ name: 'caseId', description: 'UUID of the case' })
  @ApiResponse({ status: 200, description: 'List of export packages' })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied' })
  async getExportsForCase(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExportPackageSummary[]> {
    return this.exportService.getExportsForCase(caseId, user);
  }

  @Get('exports/:id')
  @ApiOperation({
    summary: 'Retrieve metadata and signature details of an export package',
  })
  @ApiParam({ name: 'id', description: 'UUID of the export package' })
  @ApiResponse({ status: 200, description: 'Export package summary' })
  @ApiResponse({ status: 404, description: 'Export package not found' })
  async getExportById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExportPackageSummary> {
    return this.exportService.getExportById(id, user);
  }

  @Get('exports/:id/download')
  @ApiOperation({
    summary: 'Download signed evidence package archive (ZIP)',
    description:
      'Streams the encrypted ZIP archive from MinIO object storage and records EXPORT_DOWNLOADED in the immutable ledger.',
  })
  @ApiParam({ name: 'id', description: 'UUID of the export package to download' })
  @ApiResponse({ status: 200, description: 'ZIP archive file stream' })
  @ApiResponse({ status: 404, description: 'Export package not found' })
  async downloadExport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, filename, sizeBytes } = await this.exportService.downloadExport(id, user);

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': sizeBytes.toString(),
    });

    return new StreamableFile(stream);
  }

  @Post('exports/verify')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('package'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Verify an offline SDMS export package archive',
    description:
      'Unpacks ZIP, validates manifest SHA-256, verifies Ed25519 digital signature, recomputes SHA-256 on all document exhibits, and checks audit chain continuity. Emits EXPORT_VERIFIED on the ledger.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        package: { type: 'string', format: 'binary' },
      },
      required: ['package'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification verdict report' })
  @ApiResponse({ status: 400, description: 'No file provided' })
  async verifyPackage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PackageVerificationResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('A ZIP export package file must be uploaded for verification');
    }

    return this.exportService.verifyPackage(file.buffer, user);
  }
}
