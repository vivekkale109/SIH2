import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, validateSync } from 'class-validator';

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

  @IsString()
  @IsOptional()
  JWT_SECRET: string = 'dev-jwt-secret-replace-in-production-min-32-chars';

  @IsString()
  @IsOptional()
  JWT_REFRESH_SECRET: string = 'dev-refresh-secret-replace-in-production-min-32-chars';
}

export function validate(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
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
