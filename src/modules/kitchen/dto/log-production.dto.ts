import { IsNotEmpty, IsInt, Min, IsDateString } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class LogProductionDto {
  @IsUuid({ message: 'Recipe ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Recipe ID is required' })
  recipeId: string;

  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be 0 or greater' })
  quantity: number;

  @IsDateString({}, { message: 'Week date must be a valid date in ISO format (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Week date is required' })
  weekDate: string;
}

