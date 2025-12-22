import { IsDateString, IsNotEmpty } from 'class-validator';
import { IsDateRange } from '@/common/validators/is-date-range.decorator';

export class OpenAttendanceWindowDto {
  @IsDateString({}, { message: 'Sunday date must be a valid date in ISO format (YYYY-MM-DD)' })
  @IsNotEmpty({ message: 'Sunday date is required' })
  sundayDate: string;

  @IsDateString({}, { message: 'Opens at must be a valid date and time in ISO format' })
  @IsNotEmpty({ message: 'Opens at is required' })
  opensAt: string;

  @IsDateString({}, { message: 'Closes at must be a valid date and time in ISO format' })
  @IsNotEmpty({ message: 'Closes at is required' })
  @IsDateRange('opensAt', { message: 'Closes at must be after or equal to opens at' })
  closesAt: string;
}

