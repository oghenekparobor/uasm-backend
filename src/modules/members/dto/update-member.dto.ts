import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class UpdateMemberDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Birthday must be a valid date in ISO format (YYYY-MM-DD)' })
  birthday?: string;

  @IsOptional()
  @IsUuid({ message: 'Class ID must be a valid UUID' })
  currentClassId?: string;
}

