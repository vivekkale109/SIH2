import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ClassificationLevel, DocumentStatus } from '@sdms/shared-types';

export class SearchQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsString()
  @IsOptional()
  caseId?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsEnum(ClassificationLevel)
  @IsOptional()
  classification?: ClassificationLevel;

  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  endDate?: string;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @Transform(({ value }) => (value !== undefined ? parseInt(value, 10) : 20))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit: number = 20;
}
