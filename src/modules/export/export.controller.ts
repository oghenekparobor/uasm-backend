import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ExportService, ExportFormat } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export class ExportQueryDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  classId?: string;

  @IsOptional()
  status?: string;
}

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('members')
  @HttpCode(HttpStatus.OK)
  async exportMembers(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
    @AuthUser() user: AuthenticatedUser,
  ) {
    const filters: any = {};
    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) filters.createdAt.gte = new Date(query.startDate);
      if (query.endDate) filters.createdAt.lte = new Date(query.endDate);
    }
    if (query.classId) {
      filters.currentClassId = query.classId;
    }

    await this.exportService.exportMembers(query.format, res, user, filters);
  }

  @Get('attendance')
  @HttpCode(HttpStatus.OK)
  async exportAttendance(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
    @AuthUser() user: AuthenticatedUser,
  ) {
    const filters: any = {};
    if (query.startDate || query.endDate) {
      filters.markedAt = {};
      if (query.startDate) filters.markedAt.gte = new Date(query.startDate);
      if (query.endDate) filters.markedAt.lte = new Date(query.endDate);
    }
    if (query.classId) {
      filters.classId = query.classId;
    }
    if (query.status) {
      filters.status = query.status;
    }

    await this.exportService.exportAttendance(query.format, res, user, filters);
  }

  @Get('distribution')
  @HttpCode(HttpStatus.OK)
  async exportDistribution(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
    @AuthUser() user: AuthenticatedUser,
  ) {
    const filters: any = {};
    if (query.startDate || query.endDate) {
      filters.confirmedAt = {};
      if (query.startDate) filters.confirmedAt.gte = new Date(query.startDate);
      if (query.endDate) filters.confirmedAt.lte = new Date(query.endDate);
    }

    await this.exportService.exportDistribution(query.format, res, user, filters);
  }

  @Get('activity-logs')
  @HttpCode(HttpStatus.OK)
  async exportActivityLogs(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
    @AuthUser() user: AuthenticatedUser,
  ) {
    const filters: any = {};
    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) filters.createdAt.gte = new Date(query.startDate);
      if (query.endDate) filters.createdAt.lte = new Date(query.endDate);
    }

    await this.exportService.exportActivityLogs(query.format, res, user, filters);
  }

  @Get('empowerment-requests')
  @HttpCode(HttpStatus.OK)
  async exportEmpowermentRequests(
    @Query() query: ExportQueryDto,
    @Res() res: Response,
    @AuthUser() user: AuthenticatedUser,
  ) {
    const filters: any = {};
    if (query.startDate || query.endDate) {
      filters.createdAt = {};
      if (query.startDate) filters.createdAt.gte = new Date(query.startDate);
      if (query.endDate) filters.createdAt.lte = new Date(query.endDate);
    }
    if (query.status) {
      filters.status = query.status;
    }

    await this.exportService.exportEmpowermentRequests(query.format, res, user, filters);
  }
}

