import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateRecipeDto {
  @IsString({ message: 'Recipe name must be a string' })
  @IsNotEmpty({ message: 'Recipe name is required' })
  @MaxLength(100, { message: 'Recipe name must not exceed 100 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Ingredients must be a string' })
  @MaxLength(5000, { message: 'Ingredients must not exceed 5000 characters' })
  ingredients?: string;

  @IsOptional()
  @IsString({ message: 'Instructions must be a string' })
  @MaxLength(10000, { message: 'Instructions must not exceed 10000 characters' })
  instructions?: string;

  @IsOptional()
  @IsString({ message: 'Portion sizes must be a string' })
  @MaxLength(1000, { message: 'Portion sizes must not exceed 1000 characters' })
  portionSizes?: string;

  @IsOptional()
  @IsString({ message: 'Nutritional info must be a string' })
  @MaxLength(2000, { message: 'Nutritional info must not exceed 2000 characters' })
  nutritionalInfo?: string;

  @IsOptional()
  @IsString({ message: 'Category must be a string' })
  @MaxLength(50, { message: 'Category must not exceed 50 characters' })
  category?: string;
}

