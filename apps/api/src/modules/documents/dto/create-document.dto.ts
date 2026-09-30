import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ClassificationLevel } from '@sdms/shared-types';

export class CreateDocumentDto {
  @ApiProperty({
    example: 'Forensic Hard Drive Acquisition Report',
    description: 'Title or descriptive label of the document',
    minLength: 3,
    maxLength: 250,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(250)
  title!: string;

  @ApiProperty({
    example: 'FORENSIC_REPORT',
    description:
      'Document category or legal type (e.g. FIR, CHARGE_SHEET, FORENSIC_REPORT, WITNESS_STATEMENT, SEIZURE_MEMO)',
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiPropertyOptional({
    enum: ClassificationLevel,
    default: ClassificationLevel.RESTRICTED,
    description: 'Security classification clearance level',
  })
  @IsEnum(ClassificationLevel)
  @IsOptional()
  classification?: ClassificationLevel;
}
