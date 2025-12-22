import { IsNotEmpty, IsEnum } from 'class-validator';
import { LeaderRole } from '@prisma/client';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class AssignLeaderDto {
  @IsUuid({ message: 'User ID must be a valid UUID' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @IsEnum(LeaderRole, { message: `Role must be one of: ${Object.values(LeaderRole).join(', ')}` })
  @IsNotEmpty({ message: 'Leader role is required' })
  role: LeaderRole;
}

