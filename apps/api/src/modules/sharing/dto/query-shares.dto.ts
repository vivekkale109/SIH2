import { IsOptional, IsIn, IsString, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySharesDto {
  @ApiPropertyOptional({
    enum: ['sent', 'received', 'all'],
    description: 'Filter by share direction (sent by user, received by user/dept, or all)',
    default: 'all',
  })
  @IsOptional()
  @IsIn(['sent', 'received', 'all'])
  direction?: 'sent' | 'received' | 'all' = 'all';

  @ApiPropertyOptional({
    enum: ['CASE', 'DOCUMENT'],
    description: 'Filter by resource type',
  })
  @IsOptional()
  @IsIn(['CASE', 'DOCUMENT'])
  resourceType?: 'CASE' | 'DOCUMENT';

  @ApiPropertyOptional({
    description: 'Filter by specific resource ID',
  })
  @IsOptional()
  @IsString()
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'Only return unexpired and unrevoked active shares',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  activeOnly?: boolean = false;
}
