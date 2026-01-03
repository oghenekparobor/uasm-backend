import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOfferingDto {
  @IsOptional()
  @IsNumber({}, { message: 'Offering amount must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Offering amount must be 0 or greater' })
  offeringAmount?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tithe amount must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Tithe amount must be 0 or greater' })
  titheAmount?: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

