import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class CreateMemberDto {
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  @MaxLength(100, { message: 'First name must not exceed 100 characters' })
  firstName: string;

  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  @MaxLength(100, { message: 'Last name must not exceed 100 characters' })
  lastName: string;

  @IsOptional()
  @IsDateString({}, { message: 'Birthday must be a valid date in ISO format (YYYY-MM-DD)' })
  birthday?: string;

  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  currentClassId: string;
}

