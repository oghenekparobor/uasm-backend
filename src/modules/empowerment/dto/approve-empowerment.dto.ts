import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApproveEmpowermentDto {
  @IsOptional()
  @IsString({ message: 'Admin notes must be a string' })
  @MaxLength(1000, { message: 'Admin notes must not exceed 1000 characters' })
  adminNotes?: string;
}

