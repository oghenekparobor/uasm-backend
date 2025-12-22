import { IsNotEmpty, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EmpowermentType } from '@prisma/client';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class CreateEmpowermentDto {
  @IsUuid({ message: 'Member ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId: string;

  @IsEnum(EmpowermentType, { message: `Type must be one of: ${Object.values(EmpowermentType).join(', ')}` })
  @IsNotEmpty({ message: 'Empowerment type is required' })
  type: EmpowermentType;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;
}

