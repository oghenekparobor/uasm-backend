import { IsNotEmpty, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
}

export class MarkMemberAttendanceDto {
  @IsUuid({ message: 'Member ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId: string;

  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  classId: string;

  @IsUuid({ message: 'Attendance window ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Attendance window ID is required' })
  attendanceWindowId: string;

  @IsEnum(AttendanceStatus, { message: 'Status must be either present or absent' })
  @IsNotEmpty({ message: 'Status is required' })
  status: AttendanceStatus;

  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;
}

export class BulkMarkAttendanceDto {
  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  classId: string;

  @IsUuid({ message: 'Attendance window ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Attendance window ID is required' })
  attendanceWindowId: string;

  @IsNotEmpty({ message: 'Attendance records are required' })
  attendance: Array<{
    memberId: string;
    status: AttendanceStatus;
    notes?: string;
  }>;
}

