import { IsOptional, IsString, IsUUID } from 'class-validator';
import { BaseFilterDto } from '../../../common/dto/filter.dto';

export class MemberFilterDto extends BaseFilterDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsUUID()
  currentClassId?: string;
}

