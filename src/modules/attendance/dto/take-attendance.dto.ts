import { IsNotEmpty, IsInt, Min } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class TakeAttendanceDto {
  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  classId: string;

  @IsUuid({ message: 'Attendance window ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Attendance window ID is required' })
  attendanceWindowId: string;

  @IsInt({ message: 'Count must be an integer' })
  @Min(0, { message: 'Count must be 0 or greater' })
  count: number;
}

