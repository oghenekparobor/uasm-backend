import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { BaseFilterDto } from '../../common/dto/filter.dto';

export class ActivityLogsQueryDto extends BaseFilterDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsUUID()
  entityId?: string;
}

@Controller('activity-logs')
@UseGuards(JwtAuthGuard)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  findAll(@Query() query: ActivityLogsQueryDto) {
    // RLS ensures only admin/super_admin can read activity logs
    return this.activityLogsService.findAll(query);
  }

  @Get('me')
  findMyActions(@Query() query: ActivityLogsQueryDto, @AuthUser() user: AuthenticatedUser) {
    return this.activityLogsService.findAll({ ...query, actorId: user.id });
  }
}

