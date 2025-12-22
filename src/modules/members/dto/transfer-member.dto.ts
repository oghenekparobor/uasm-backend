import { IsNotEmpty } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class TransferMemberDto {
  @IsUuid({ message: 'Class ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Class ID is required' })
  toClassId: string;
}

