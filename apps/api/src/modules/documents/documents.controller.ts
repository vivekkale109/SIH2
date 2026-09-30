import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
  Res,
  StreamableFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/auth.interface';
import { CreateDocumentDto } from './dto/create-document.dto';
import {
  DocumentSummary,
  DocumentDetailSummary,
  DocumentVersionSummary,
  DocumentIntegrityResult,
  ClassificationLevel,
} from '@sdms/shared-types';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id')
  @ApiOperation({
    summary: 'Get document details and complete version history',
    description: 'Evaluates case clearance via ABAC and logs a DOCUMENT_VIEWED audit entry.',
  })
  @ApiResponse({ status: 200, description: 'Document details retrieved' })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied: User lacks required clearance' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentDetailSummary> {
    return this.documentsService.getDocumentById(id, user);
  }

  @Get(':id/versions')
  @ApiOperation({
    summary: 'Get all immutable versions for a document',
  })
  @ApiResponse({ status: 200, description: 'Version history retrieved' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentVersionSummary[]> {
    return this.documentsService.getVersions(id, user);
  }

  @Post(':id/versions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a new version for an existing evidence document',
    description:
      'Scans for malware via ClamAV, computes SHA-256 digest, uploads to MinIO, increments version number monotonically, and appends to audit ledger without modifying previous versions.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'New version uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Malware detected, invalid file type, or case archived',
  })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied' })
  async uploadNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentDetailSummary> {
    if (!file) {
      throw new BadRequestException('A replacement file must be attached');
    }
    return this.documentsService.uploadNewVersion(id, file, user);
  }

  @Post(':id/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify cryptographic integrity of stored document',
    description:
      'Reads raw bytes directly from MinIO object storage, calculates real-time SHA-256 digest, and validates it against the stored version hash. Emits DOCUMENT_INTEGRITY_VERIFIED or DOCUMENT_INTEGRITY_FAILED ledger event.',
  })
  @ApiQuery({
    name: 'versionNo',
    required: false,
    type: Number,
    description: 'Specific version number to verify (defaults to latest version)',
  })
  @ApiResponse({ status: 200, description: 'Integrity verification result' })
  @ApiResponse({ status: 404, description: 'Document or version not found' })
  async verifyIntegrity(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('versionNo') versionNo?: string,
  ): Promise<DocumentIntegrityResult> {
    const vNo = versionNo ? parseInt(versionNo, 10) : undefined;
    return this.documentsService.verifyIntegrity(id, vNo, user);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Download document stream securely',
    description: 'Streams decrypted file from MinIO and logs a DOCUMENT_DOWNLOADED audit event.',
  })
  @ApiQuery({
    name: 'versionNo',
    required: false,
    type: Number,
    description: 'Specific version number to download (defaults to latest)',
  })
  @ApiResponse({ status: 200, description: 'File stream download' })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied' })
  @ApiResponse({ status: 404, description: 'Document or version not found' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
    @Query('versionNo') versionNo?: string,
  ): Promise<StreamableFile> {
    const vNo = versionNo ? parseInt(versionNo, 10) : undefined;
    const { stream, mimeType, filename, sizeBytes } = await this.documentsService.download(
      id,
      vNo,
      user,
    );

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': sizeBytes.toString(),
    });

    return new StreamableFile(stream);
  }

  @Get('cases/:caseId')
  @ApiOperation({
    summary: 'List documents for a case (alias route)',
  })
  @ApiResponse({ status: 200, description: 'List of documents in case' })
  async listCaseDocuments(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentSummary[]> {
    return this.documentsService.getDocumentsForCase(caseId, user);
  }
}

@ApiTags('Cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cases/:caseId/documents')
export class CaseDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload and attach a document to a case',
    description:
      'Validates file size (max 50MB) and MIME type, scans for malware with ClamAV, computes SHA-256, encrypts and stores in MinIO SSE, assigns version 1, and logs to the immutable audit ledger.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string', example: 'Forensic Disk Image Log' },
        type: { type: 'string', example: 'FORENSIC_REPORT' },
        classification: {
          type: 'string',
          enum: Object.values(ClassificationLevel),
          default: ClassificationLevel.RESTRICTED,
        },
      },
      required: ['file', 'title', 'type'],
    },
  })
  @ApiResponse({ status: 201, description: 'Document successfully ingested and attached' })
  @ApiResponse({ status: 400, description: 'Invalid file, malware detected, or case archived' })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied: User lacks clearance' })
  async upload(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentDetailSummary> {
    if (!file) {
      throw new BadRequestException('A file must be attached for document upload');
    }
    return this.documentsService.upload(caseId, file, dto, user);
  }

  @Get()
  @ApiOperation({
    summary: 'List all documents attached to an investigation case',
  })
  @ApiResponse({ status: 200, description: 'List of documents in case' })
  @ApiResponse({ status: 403, description: 'ABAC Access Denied' })
  async findAll(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DocumentSummary[]> {
    return this.documentsService.getDocumentsForCase(caseId, user);
  }
}
