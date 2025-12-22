import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { ClassType } from '@prisma/client';

export class CreateClassDto {
  @IsString({ message: 'Class name must be a string' })
  @IsNotEmpty({ message: 'Class name is required' })
  @MaxLength(100, { message: 'Class name must not exceed 100 characters' })
  name: string;

  @IsEnum(ClassType, { message: `Type must be one of: ${Object.values(ClassType).join(', ')}` })
  @IsNotEmpty({ message: 'Class type is required' })
  type: ClassType;
}

