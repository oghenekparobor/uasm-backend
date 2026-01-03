import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { BaseFilterDto } from '../../../common/dto/filter.dto';

export class UserFilterDto extends BaseFilterDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map(r => r.trim()).filter(r => r.length > 0);
    }
    return Array.isArray(value) ? value : [];
  })
  roles?: string[];
}

