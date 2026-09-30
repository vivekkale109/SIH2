import 'reflect-metadata';
import { Transform, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  MINIO_ENDPOINT: string = 'localhost';

  @IsNumber()
  @IsOptional()
  MINIO_PORT: number = 9002;

  @IsString()
  @IsOptional()
  MINIO_ROOT_USER: string = 'minioadmin';

  @IsString()
  @IsOptional()
  MINIO_ROOT_PASSWORD: string = 'minioadmin';

  @IsString()
  @IsOptional()
  MINIO_BUCKET: string = 'sdms-documents';

  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return Boolean(value);
  })
  @IsBoolean()
  @IsOptional()
  MINIO_USE_SSL: boolean = false;

  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === '1' || value === 1) return true;
    if (value === 'false' || value === false || value === '0' || value === 0) return false;
    return Boolean(value);
  })
  @IsBoolean()
  @IsOptional()
  MINIO_SSE_ENABLED: boolean = false;

  @IsString()
  @IsOptional()
  CLAMAV_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  CLAMAV_PORT: number = 3310;

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'dev-jwt-secret-replace-in-production-min-32-chars';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'dev-refresh-secret-replace-in-production-min-32-chars';
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const normalizedConfig = { ...config };
  for (const key of ['MINIO_USE_SSL', 'MINIO_SSE_ENABLED']) {
    if (normalizedConfig[key] !== undefined) {
      const val = normalizedConfig[key];
      normalizedConfig[key] = val === true || val === 'true' || val === '1' || val === 1;
    }
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, normalizedConfig, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((err) => Object.values(err.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`Environment validation error: ${errorMessages}`);
  }

  return validatedConfig;
}
