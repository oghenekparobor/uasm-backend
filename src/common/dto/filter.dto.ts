import { IsOptional, IsString, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class TextSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  searchFields?: string; // Comma-separated field names, e.g., "firstName,lastName,email"
}

export class SortDto {
  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}

export class BaseFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  searchFields?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export interface FilterOptions {
  search?: string;
  searchFields?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  dateFrom?: Date;
  dateTo?: Date;
}

export function buildTextSearchFilter(
  search?: string,
  searchFields?: string[],
): Record<string, any> | undefined {
  if (!search || !searchFields || searchFields.length === 0) {
    return undefined;
  }

  const searchLower = search.toLowerCase();

  // Build OR conditions for multiple fields
  return {
    OR: searchFields.map((field) => {
      // Handle nested fields (e.g., "user.email")
      const fieldParts = field.split('.');
      
      if (fieldParts.length === 1) {
        return {
          [field]: {
            contains: searchLower,
            mode: 'insensitive',
          },
        };
      } else {
        // For nested fields, we'll need to handle them differently
        // This is a simplified version - you may need to adjust based on your schema
        return {
          [fieldParts[0]]: {
            [fieldParts[1]]: {
              contains: searchLower,
              mode: 'insensitive',
            },
          },
        };
      }
    }),
  };
}

export function buildDateRangeFilter(
  dateFrom?: string | Date,
  dateTo?: string | Date,
  fieldName: string = 'createdAt',
): Record<string, any> | undefined {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const filter: Record<string, any> = {};

  if (dateFrom) {
    const fromDate = typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
    filter.gte = fromDate;
  }

  if (dateTo) {
    const toDate = typeof dateTo === 'string' ? new Date(dateTo) : dateTo;
    // Add one day to include the entire end date
    toDate.setHours(23, 59, 59, 999);
    filter.lte = toDate;
  }

  return Object.keys(filter).length > 0 ? { [fieldName]: filter } : undefined;
}

export function buildSortOrder(
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  defaultSortBy: string = 'createdAt',
  defaultSortOrder: 'asc' | 'desc' = 'desc',
): Record<string, 'asc' | 'desc'> {
  return {
    [sortBy || defaultSortBy]: sortOrder || defaultSortOrder,
  };
}

export function parseSearchFields(fields?: string): string[] {
  if (!fields) {
    return [];
  }
  return fields.split(',').map((f) => f.trim()).filter((f) => f.length > 0);
}

