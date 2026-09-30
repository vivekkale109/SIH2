import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@sdms/shared-types';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Inspector Rajesh Sharma', description: 'Full name' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'DL-POL-4412', description: 'Badge or service number' })
  @IsOptional()
  @IsString()
  badgeNumber?: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Updated system role' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Updated department UUID' })
  @IsOptional()
  @IsUUID('all')
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
