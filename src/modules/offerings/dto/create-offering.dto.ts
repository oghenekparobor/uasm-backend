import { IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';
import { Type } from 'class-transformer';

export class CreateOfferingDto {
  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  classId: string;

  @IsUuid({ message: 'Attendance window ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Attendance window ID is required' })
  attendanceWindowId: string;

  @IsNumber({}, { message: 'Offering amount must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Offering amount must be 0 or greater' })
  offeringAmount: number;

  @IsNumber({}, { message: 'Tithe amount must be a number' })
  @Type(() => Number)
  @Min(0, { message: 'Tithe amount must be 0 or greater' })
  titheAmount: number;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

