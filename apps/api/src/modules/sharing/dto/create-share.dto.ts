import { IsString, IsNotEmpty, IsIn, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShareScope } from '@sdms/shared-types';

export class CreateShareDto {
  @ApiProperty({
    enum: ['CASE', 'DOCUMENT'],
    description: 'Type of resource being shared',
    example: 'CASE',
  })
  @IsIn(['CASE', 'DOCUMENT'], {
    message: "resourceType must be either 'CASE' or 'DOCUMENT'",
  })
  resourceType!: 'CASE' | 'DOCUMENT';

  @ApiProperty({
    description: 'UUID of the case or document to share',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsString()
  @IsNotEmpty()
  resourceId!: string;

  @ApiPropertyOptional({
    description: 'Target user ID to grant individual access',
    example: 'b1ffcd88-8b1a-4fe7-aa5c-5aa8ac270b22',
  })
  @IsOptional()
  @IsString()
  granteeId?: string;

  @ApiPropertyOptional({
    description: 'Target department ID to grant department-wide access',
    example: 'c2eedc77-7a2b-4cd6-994b-4bb7ab160c33',
  })
  @IsOptional()
  @IsString()
  granteeDepartmentId?: string;

  @ApiProperty({
    enum: ShareScope,
    description:
      'Access scope: VIEW_ONLY restricts to read/stream preview; DOWNLOAD allows full file retrieval',
    example: ShareScope.VIEW_ONLY,
  })
  @IsEnum(ShareScope)
  scope!: ShareScope;

  @ApiProperty({
    description: 'Expiration ISO 8601 timestamp after which the share automatically revokes',
    example: '2026-10-15T18:00:00.000Z',
  })
  @IsDateString()
  expiresAt!: string;

  @ApiPropertyOptional({
    description: 'User password re-confirmation for sensitive re-authentication verification',
  })
  @IsOptional()
  @IsString()
  passwordConfirm?: string;
}
