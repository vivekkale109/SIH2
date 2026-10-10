import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { ClassificationLevel } from '@sdms/shared-types';

export class UpdateOcrVerificationDto {
  @IsString()
  @IsOptional()
  extractedText?: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsEnum(ClassificationLevel)
  @IsOptional()
  classification?: ClassificationLevel;

  @IsObject()
  @IsOptional()
  extractedMetadata?: Record<string, unknown>;
}
