import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsUuid } from '@/common/validators/is-uuid.decorator';

export class CreateMemberLogDto {
  @IsUuid({ message: 'Member ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Member ID is required' })
  memberId: string;

  @IsString({ message: 'Note must be a string' })
  @IsNotEmpty({ message: 'Note is required' })
  @MaxLength(5000, { message: 'Note must not exceed 5000 characters' })
  note: string;
}

