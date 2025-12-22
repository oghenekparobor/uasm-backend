import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateRequestDto {
  @IsString({ message: 'Request type must be a string' })
  @IsNotEmpty({ message: 'Request type is required' })
  @MaxLength(50, { message: 'Request type must not exceed 50 characters' })
  type: string; // aid, absence, supplies, role_change, etc

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;
}

