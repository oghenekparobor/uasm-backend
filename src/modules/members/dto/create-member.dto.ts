import { IsString, IsNotEmpty, IsOptional, IsDateString, MaxLength, IsEmail, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  @MaxLength(20, { message: 'Phone number must not exceed 20 characters' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @MaxLength(500, { message: 'Address must not exceed 500 characters' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Emergency contact must be a string' })
  @MaxLength(500, { message: 'Emergency contact must not exceed 500 characters' })
  emergencyContact?: string;

  @IsOptional()
  @IsString({ message: 'Occupation must be a string' })
  @MaxLength(100, { message: 'Occupation must not exceed 100 characters' })
  occupation?: string;

  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  @MaxLength(50, { message: 'Status must not exceed 50 characters' })
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Age must be an integer' })
  @Min(0, { message: 'Age must be 0 or greater' })
  @Max(150, { message: 'Age must not exceed 150' })
  age?: number;

  @IsOptional()
  @IsString({ message: 'Gender must be a string' })
  @MaxLength(50, { message: 'Gender must not exceed 50 characters' })
  gender?: string;

  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  currentClassId: string;
}

