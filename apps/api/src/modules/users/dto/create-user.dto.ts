import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@sdms/shared-types';

export class CreateUserDto {
  @ApiProperty({ example: 'investigator.sharma@police.gov.in', description: 'Official email' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email!: string;

  @ApiProperty({
    example: 'Secure#Police2026!',
    description: 'Initial password (min 12 chars, upper, lower, digit, symbol)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  password!: string;

  @ApiProperty({ example: 'Inspector Rajesh Sharma', description: 'Full name' })
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  fullName!: string;

  @ApiPropertyOptional({ example: 'DL-POL-4412', description: 'Official badge or staff ID' })
  @IsOptional()
  @IsString()
  badgeNumber?: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.INVESTIGATOR,
    description: 'Assigned system role',
  })
  @IsEnum(UserRole, { message: 'Must be a valid UserRole' })
  @IsNotEmpty({ message: 'Role is required' })
  role!: UserRole;

  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', description: 'Department UUID' })
  @IsUUID('all', { message: 'Department ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Department ID is required' })
  departmentId!: string;
}
