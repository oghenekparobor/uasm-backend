import { IsOptional, IsString, IsUUID, IsDateString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
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

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  @Type(() => String)
  currentClassIds?: string[];

  @IsOptional()
  @IsDateString()
  birthdayFrom?: string;

  @IsOptional()
  @IsDateString()
  birthdayTo?: string;
}

