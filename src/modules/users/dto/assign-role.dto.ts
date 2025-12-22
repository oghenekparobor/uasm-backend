import { IsNotEmpty, IsInt, Min } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class AssignRoleDto {
  @IsUuid({ message: 'User ID must be a valid UUID' })
  @IsNotEmpty({ message: 'User ID is required' })
  userId: string;

  @IsInt({ message: 'Role ID must be an integer' })
  @Min(1, { message: 'Role ID must be greater than 0' })
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId: number;
}

