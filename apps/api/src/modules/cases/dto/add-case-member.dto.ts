import { IsNotEmpty, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CaseMemberRole } from '@sdms/shared-types';

export class AddCaseMemberDto {
  @ApiProperty({
    description: 'User UUID to assign to the case',
    example: 'd9b23aa3-b0c2-66c2-b280-68bc5f52a6f4',
  })
  @IsNotEmpty()
  @IsUUID('4')
  userId!: string;

  @ApiProperty({
    enum: CaseMemberRole,
    description: 'Case-level role assignment',
    example: CaseMemberRole.INVESTIGATOR,
  })
  @IsNotEmpty()
  @IsEnum(CaseMemberRole)
  caseRole!: CaseMemberRole;
}
