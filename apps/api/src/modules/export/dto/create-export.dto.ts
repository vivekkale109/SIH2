import { IsOptional, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExportDto {
  @ApiPropertyOptional({
    description:
      'Specific document UUIDs to include in export. If omitted, all case documents are exported.',
    type: [String],
    example: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentIds?: string[];

  @ApiPropertyOptional({
    description: 'Password re-confirmation for sensitive action verification (non-repudiation)',
    example: 'Secure#Demo2026!',
  })
  @IsOptional()
  @IsString()
  passwordConfirm?: string;

  @ApiPropertyOptional({
    description: 'Investigator or prosecutor notes to append to the evidence certificate',
    example: 'Court submission for preliminary hearing at Principal Sessions Court',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
