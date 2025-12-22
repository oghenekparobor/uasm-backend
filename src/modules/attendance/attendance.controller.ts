import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { OpenAttendanceWindowDto } from './dto/open-attendance-window.dto';
import { TakeAttendanceDto } from './dto/take-attendance.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsUUID, IsOptional } from 'class-validator';
import { BaseFilterDto } from '../../common/dto/filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AttendanceQueryDto extends BaseFilterDto {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  windowId?: string;
}

@Controller('attendance')
@UseGuards(JwtAuthGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('windows')
  @HttpCode(HttpStatus.CREATED)
  openWindow(@Body() dto: OpenAttendanceWindowDto, @AuthUser() user: AuthenticatedUser) {
    return this.attendanceService.openWindow(dto, user);
  }

  @Get('windows')
  findAllWindows() {
    return this.attendanceService.findAllWindows();
  }

  @Get('windows/current')
  findCurrentWindow() {
    return this.attendanceService.findCurrentWindow();
  }

  @Get('windows/:id')
  findOneWindow(@Param('id') id: string) {
    return this.attendanceService.findOneWindow(id);
  }

  @Patch('windows/:id/close')
  @HttpCode(HttpStatus.OK)
  closeWindow(@Param('id') id: string) {
    return this.attendanceService.closeWindow(id);
  }

  @Post('classes/:classId')
  @HttpCode(HttpStatus.CREATED)
  submitAttendance(
    @Param('classId') classId: string,
    @Body() dto: Omit<TakeAttendanceDto, 'classId'>,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.takeAttendance({ ...dto, classId }, user);
  }

  @Get('classes/:classId')
  getClassAttendance(
    @Param('classId') classId: string,
    @Query('windowId') windowId?: string,
    @Query() filters?: AttendanceQueryDto,
  ) {
    return this.attendanceService.findAllAttendance(classId, windowId, filters);
  }

  @Get('summary')
  getSummary(@Query('windowId') windowId?: string) {
    return this.attendanceService.getSummary(windowId);
  }

  @Get()
  findAll(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.findAllAttendance(query.classId, query.windowId, query);
  }
}

