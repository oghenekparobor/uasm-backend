import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, MaxLength, IsDateString } from 'class-validator';
import { EventScope } from '@prisma/client';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class CreateEventDto {
  @IsString({ message: 'Event title must be a string' })
  @IsNotEmpty({ message: 'Event title is required' })
  @MaxLength(200, { message: 'Event title must not exceed 200 characters' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(2000, { message: 'Description must not exceed 2000 characters' })
  description?: string;

  @IsEnum(EventScope, { message: `Scope must be one of: ${Object.values(EventScope).join(', ')}` })
  @IsNotEmpty({ message: 'Event scope is required' })
  scope: EventScope;

  @IsOptional()
  @IsUuid({ message: 'Class ID must be a valid UUID' })
  classId?: string;

  @IsDateString({}, { message: 'Event date must be a valid date in ISO format' })
  @IsNotEmpty({ message: 'Event date is required' })
  eventDate: string;

  @IsOptional()
  @IsBoolean({ message: 'isRecurring must be a boolean value' })
  isRecurring?: boolean;
}

