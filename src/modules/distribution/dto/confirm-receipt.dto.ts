import { IsNotEmpty, IsInt, Min } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class ConfirmReceiptDto {
  @IsUuid({ message: 'Attendance window ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Attendance window ID is required' })
  attendanceWindowId: string;

  @IsInt({ message: 'Total food received must be an integer' })
  @Min(0, { message: 'Total food received must be 0 or greater' })
  totalFoodReceived: number;

  @IsInt({ message: 'Total water received must be an integer' })
  @Min(0, { message: 'Total water received must be 0 or greater' })
  totalWaterReceived: number;
}

