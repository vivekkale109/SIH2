import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EnableMfaDto {
  @ApiProperty({ description: 'MFA secret provided during generate step' })
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'MFA code must be exactly 6 digits' })
  code!: string;
}

export class VerifyMfaDto {
  @ApiProperty({ example: '123456', description: '6-digit TOTP code' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'MFA code must be exactly 6 digits' })
  code!: string;
}

export class DisableMfaDto {
  @ApiProperty({ description: 'Current password to confirm MFA disable action' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
