import { IsNotEmpty, IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassificationLevel } from '@sdms/shared-types';

export class CreateCaseDto {
  @ApiProperty({
    description: 'Unique case / FIR reference number',
    example: 'FIR-2026-DEL-0042',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,50}$/, {
    message: 'caseNumber must contain 3-50 alphanumeric characters, hyphens, or underscores',
  })
  caseNumber!: string;

  @ApiProperty({
    description: 'Title of the investigation case',
    example: 'Financial Securities Manipulation Investigation',
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({
    description: 'Detailed description and initial summary',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ClassificationLevel,
    default: ClassificationLevel.RESTRICTED,
    description: 'Security classification clearance level',
  })
  @IsOptional()
  @IsEnum(ClassificationLevel)
  classification?: ClassificationLevel = ClassificationLevel.RESTRICTED;

  @ApiPropertyOptional({
    description: 'Department ID (defaults to creator department if omitted)',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;
}
