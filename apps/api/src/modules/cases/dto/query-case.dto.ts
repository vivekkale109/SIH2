import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus, ClassificationLevel } from '@sdms/shared-types';

export class QueryCaseDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Search case number or title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CaseStatus, description: 'Filter by case status' })
  @IsOptional()
  @IsEnum(CaseStatus)
  status?: CaseStatus;

  @ApiPropertyOptional({
    enum: ClassificationLevel,
    description: 'Filter by classification clearance level',
  })
  @IsOptional()
  @IsEnum(ClassificationLevel)
  classification?: ClassificationLevel;

  @ApiPropertyOptional({ description: 'Filter by originating department ID' })
  @IsOptional()
  @IsString()
  departmentId?: string;
}
