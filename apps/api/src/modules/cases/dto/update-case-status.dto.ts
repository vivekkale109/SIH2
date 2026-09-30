import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus } from '@sdms/shared-types';

export class UpdateCaseStatusDto {
  @ApiProperty({
    enum: CaseStatus,
    description: 'Target case lifecycle status',
    example: CaseStatus.UNDER_REVIEW,
  })
  @IsNotEmpty()
  @IsEnum(CaseStatus)
  status!: CaseStatus;

  @ApiPropertyOptional({
    description: 'Reason for the lifecycle status transition (recorded in tamper-evident ledger)',
    example: 'Investigation complete, submitting charge sheet for prosecution review',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
