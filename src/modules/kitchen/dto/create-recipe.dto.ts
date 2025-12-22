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
}

