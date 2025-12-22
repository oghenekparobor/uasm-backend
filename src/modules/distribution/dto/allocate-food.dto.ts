import { IsNotEmpty, IsInt, Min, IsEnum } from 'class-validator';
import { AllocationType } from '@prisma/client';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class AllocateFoodDto {
  @IsUuid({ message: 'Distribution batch ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Distribution batch ID is required' })
  distributionBatchId: string;

  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  classId: string;

  @IsInt({ message: 'Food allocated must be an integer' })
  @Min(0, { message: 'Food allocated must be 0 or greater' })
  foodAllocated: number;

  @IsInt({ message: 'Water allocated must be an integer' })
  @Min(0, { message: 'Water allocated must be 0 or greater' })
  waterAllocated: number;

  @IsEnum(AllocationType, { message: `Allocation type must be one of: ${Object.values(AllocationType).join(', ')}` })
  @IsNotEmpty({ message: 'Allocation type is required' })
  allocationType: AllocationType;
}

